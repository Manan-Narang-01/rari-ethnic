from collections import defaultdict
from typing import Optional

from fastapi import HTTPException, status

from app.models.order import Order, OrderCreate, OrderItem
from app.repositories.order_repo import OrderRepository
from app.repositories.product_repo import ProductRepository
from app.repositories.user_repo import UserRepository
from app.services.email_service import EmailService
from app.services.email_templates import admin_new_order_email, order_confirmed_email, order_status_email


class OrderService:
    """Recomputes pricing from the database on every order -- the client's
    subtotal/shipping/total are accepted for schema compatibility but never
    trusted, since a request body is fully attacker-controlled."""

    @staticmethod
    async def create(payload: OrderCreate, user_id: Optional[str]) -> Order:
        if not payload.items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

        # Batch-fetched once instead of one get_by_id() round-trip per line
        # item -- checkout is the most latency-sensitive path in the app.
        product_ids = list({item.product_id for item in payload.items})
        products_by_id = await ProductRepository.get_by_ids(product_ids)

        # Aggregated per product (not per line item) so ordering the same
        # product in two sizes is checked against its combined demand, not
        # validated against stock twice independently.
        requested_qty: dict = defaultdict(int)
        for item in payload.items:
            requested_qty[item.product_id] += item.quantity

        resolved_items: list[OrderItem] = []
        subtotal = 0
        shipping_surcharge = 0
        has_shipping_override = False

        for item in payload.items:
            product = products_by_id.get(item.product_id)
            # `detail` is a small object (not a plain string) for these three
            # rejection cases specifically, carrying the offending
            # product_id(s) alongside the message -- Checkout.jsx uses it to
            # remove exactly that cart item so a retry isn't stuck failing
            # against the same stale line forever. Every other error path in
            # this app still returns a plain string detail; this endpoint's
            # frontend caller is written to handle both shapes.
            if not product or not product.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": f"'{item.name}' is no longer available", "product_ids": [item.product_id]},
                )
            if requested_qty[item.product_id] > product.get("stock", 0):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "message": f"Only {product.get('stock', 0)} left of '{product['name']}' -- please update your cart",
                        "product_ids": [item.product_id],
                    },
                )
            price = product["price"]
            subtotal += price * item.quantity
            if product.get("shipping_enabled"):
                has_shipping_override = True
                shipping_surcharge += product.get("shipping_charge", 0) * item.quantity

            resolved_items.append(OrderItem(
                product_id=product["id"],
                slug=product["slug"],
                name=product["name"],
                price=price,
                quantity=item.quantity,
                size=item.size,
                image=(product.get("images") or [None])[0],
            ))

        # Re-validated here atomically (compare-and-swap per product, one
        # transaction) right before the order is created -- the check above
        # reads a snapshot that a concurrent order could invalidate between
        # that read and this write, so this is the actual authoritative gate
        # against overselling, not just a nicer error message.
        failed_ids = await ProductRepository.decrement_stock_atomic(dict(requested_qty))
        if failed_ids:
            names = ", ".join(products_by_id[pid]["name"] for pid in failed_ids if pid in products_by_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": f"Sorry, {names} just sold out -- please update your cart", "product_ids": failed_ids},
            )

        # Shipping is opt-in per product -- no site-wide default fee applies.
        # An order with no shipping-enabled items always ships free.
        shipping = shipping_surcharge if has_shipping_override else 0

        total = subtotal + shipping

        # Online-payment orders sit as pending_payment until
        # RazorpayService.verify_payment confirms the signature server-side
        # (see api/v1/orders.py) -- only COD is trusted to go straight to
        # confirmed, since no payment step happens for it.
        initial_status = "pending_payment" if payload.payment_method == "razorpay" else "confirmed"

        order = Order(
            **payload.model_dump(exclude={"items", "subtotal", "shipping", "total"}),
            items=resolved_items,
            subtotal=subtotal,
            shipping=shipping,
            total=total,
            user_id=user_id,
            status=initial_status,
        )
        doc = order.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["items"] = [i.model_dump() for i in resolved_items]
        await OrderRepository.insert(doc)

        if initial_status == "confirmed":
            await OrderService.notify_confirmed(doc)

        return order

    @staticmethod
    async def notify_confirmed(order_doc: dict) -> None:
        """Fires the 'order confirmed' customer email + 'new order' admin
        alert. Called for COD orders immediately on creation, and for
        online-payment orders only after RazorpayService.verify_payment
        succeeds (see api/v1/payments.py) -- never on a merely-attempted
        payment, since pending_payment orders may never complete."""
        subject, html = order_confirmed_email(order_doc)
        await EmailService.send(order_doc["email"], subject, html)

        staff_emails = await UserRepository.list_staff_emails()
        if staff_emails:
            subject, html = admin_new_order_email(order_doc)
            await EmailService.send(staff_emails, subject, html)

    @staticmethod
    async def notify_status_change(order_doc: dict, new_status: str) -> None:
        """Customer-facing status update email (dispatched/delivered/cancelled)."""
        if new_status not in ("dispatched", "delivered", "cancelled"):
            return
        subject, html = order_status_email(order_doc, new_status)
        await EmailService.send(order_doc["email"], subject, html)
