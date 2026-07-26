from typing import Optional

from fastapi import HTTPException, status

from app.models.order import Order, OrderCreate, OrderItem
from app.repositories.order_repo import OrderRepository
from app.repositories.product_repo import ProductRepository
from app.repositories.site_settings_repo import SiteSettingsRepository

DEFAULT_FREE_SHIPPING_THRESHOLD = 2000
DEFAULT_SHIPPING_FEE = 99


class OrderService:
    """Recomputes pricing from the database on every order -- the client's
    subtotal/shipping/total are accepted for schema compatibility but never
    trusted, since a request body is fully attacker-controlled."""

    @staticmethod
    async def create(payload: OrderCreate, user_id: Optional[str]) -> Order:
        if not payload.items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

        resolved_items: list[OrderItem] = []
        subtotal = 0
        shipping_surcharge = 0
        has_shipping_override = False

        for item in payload.items:
            product = await ProductRepository.get_by_id(item.product_id)
            if not product or not product.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"'{item.name}' is no longer available",
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

        if has_shipping_override:
            shipping = shipping_surcharge
        else:
            site_settings = await SiteSettingsRepository.get()
            threshold = site_settings["free_shipping_threshold"] if site_settings else DEFAULT_FREE_SHIPPING_THRESHOLD
            fee = site_settings["shipping_fee"] if site_settings else DEFAULT_SHIPPING_FEE
            shipping = 0 if subtotal >= threshold else fee

        total = subtotal + shipping

        order = Order(
            **payload.model_dump(exclude={"items", "subtotal", "shipping", "total"}),
            items=resolved_items,
            subtotal=subtotal,
            shipping=shipping,
            total=total,
            user_id=user_id,
        )
        doc = order.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["items"] = [i.model_dump() for i in resolved_items]
        await OrderRepository.insert(doc)
        return order
