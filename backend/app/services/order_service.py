from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status

from app.config import settings
from app.models.order import Order, OrderCreate, OrderItem
from app.repositories.order_repo import OrderRepository
from app.repositories.product_repo import ProductRepository
from app.repositories.user_repo import UserRepository
from app.services.email_service import EmailService
from app.services.email_templates import admin_new_order_email, order_confirmed_email, order_status_email
from app.services.razorpay_service import RazorpayService


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
        """Customer-facing status update email (dispatched/delivered/cancelled/refunded)."""
        if new_status not in ("dispatched", "delivered", "cancelled", "refunded"):
            return
        subject, html = order_status_email(order_doc, new_status)
        await EmailService.send(order_doc["email"], subject, html)

    @staticmethod
    async def restock_cancelled_order(order_doc: dict) -> None:
        """Releases the stock reserved at order creation (see create()) back
        into inventory. Shared by the admin's manual cancel action
        (api/v1/admin_orders.py) and the automatic pending_payment expiry
        sweep below, so both restock identically -- call this only after the
        status transition into "cancelled" has already been won via
        OrderRepository.update_status's compare-and-swap, so it can never run
        twice for the same order."""
        quantities: dict = defaultdict(int)
        for item in order_doc["items"]:
            quantities[item["product_id"]] += item["quantity"]
        await ProductRepository.restock(dict(quantities))

    @staticmethod
    async def expire_stale_pending_payments() -> int:
        """Auto-cancels Razorpay orders that have sat unpaid past
        PENDING_PAYMENT_TIMEOUT_MINUTES and releases their reserved stock.
        Without this, an abandoned payment attempt (closed tab, failed OTP,
        changed their mind) reserves stock forever, since stock is
        decremented at order creation rather than at payment confirmation
        (see create()) -- a slow stock leak that shows up as false
        stockouts on real inventory. Called on a background loop (see
        app/main.py).

        Each cancellation is a compare-and-swap (`expected_status=
        "pending_payment"`) so this can never race against an admin
        manually cancelling the same order, or against the payment actually
        completing (RazorpayService.verify_payment) in the same instant --
        whichever transition wins the database row is the only one that
        restocks."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.pending_payment_timeout_minutes)
        stale_orders = await OrderRepository.list_stale_pending_payment(cutoff)
        expired_count = 0
        for order in stale_orders:
            won = await OrderRepository.update_status(
                order["order_number"], "cancelled", expected_status="pending_payment",
            )
            if not won:
                continue  # already moved on (paid, or cancelled elsewhere) -- don't touch stock
            await OrderService.restock_cancelled_order(order)
            await OrderService.notify_status_change(order, "cancelled")
            expired_count += 1
        return expired_count

    @staticmethod
    async def confirm_or_refund_payment(order: dict, razorpay_payment_id: str) -> dict:
        """Given a Razorpay payment the caller has already proven genuine
        (verified the client-side order/payment HMAC in /verify, or the
        webhook HMAC in /webhooks/razorpay), confirms the order if it's
        still open, or refunds the payment if the order was already closed
        out from under it (most likely by expire_stale_pending_payments).
        Shared by both call sites -- the client's own /verify callback, and
        the payment.captured webhook that catches a payment whose browser
        never got to call back at all (closed tab, crash, lost connection
        right after paying) -- so a customer gets the same safe outcome
        (confirmed order, or an automatic refund) regardless of which path
        notices their payment first. Idempotent against Razorpay's
        at-least-once webhook delivery and a client retry: an
        already-"confirmed" order short-circuits, and every transition
        below is a compare-and-swap, so a redelivered event can't confirm
        or refund twice.

        Returns {"outcome": "already_confirmed" | "confirmed" | "refunded"
        | "already_handled"[, "refund_id": str]}."""
        if order["status"] == "confirmed":
            return {"outcome": "already_confirmed"}

        if order["status"] == "pending_payment":
            won = await OrderRepository.update_status(
                order["order_number"], "confirmed", expected_status="pending_payment",
            )
            if not won:
                # Lost the race (e.g. the expiry sweep cancelled it a moment
                # ago) -- re-fetch and let the branch below do the right
                # thing for whatever it became instead.
                refreshed = await OrderRepository.get_by_order_number(order["order_number"])
                return await OrderService.confirm_or_refund_payment(refreshed, razorpay_payment_id)
            await OrderRepository.update_by_order_number(order["order_number"], {"razorpay_payment_id": razorpay_payment_id})
            confirmed_order = await OrderRepository.get_by_order_number(order["order_number"])
            await OrderService.notify_confirmed(confirmed_order)
            return {"outcome": "confirmed"}

        # Order already closed (cancelled by the expiry sweep, most likely)
        # -- refund the payment we can now prove actually happened. See
        # api/v1/payments.py's prior inline version of this same logic for
        # the original reasoning on claim-before-refund ordering.
        prior_status = order["status"]
        won = await OrderRepository.update_status(order["order_number"], "refunded", expected_status=prior_status)
        if not won:
            return {"outcome": "already_handled"}
        try:
            refund = await RazorpayService.refund_payment(razorpay_payment_id)
        except HTTPException:
            await OrderRepository.update_status(order["order_number"], prior_status, expected_status="refunded")
            raise
        await OrderRepository.update_by_order_number(order["order_number"], {
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_refund_id": refund.get("id"),
        })
        refunded_order = await OrderRepository.get_by_order_number(order["order_number"])
        await OrderService.notify_status_change(refunded_order, "refunded")
        return {"outcome": "refunded", "refund_id": refund.get("id")}
