from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_admin
from app.models.order import ORDER_STATUS_TRANSITIONS, VALID_ORDER_STATUSES, Order, OrderStatusUpdate
from app.repositories.order_repo import OrderRepository
from app.repositories.product_repo import ProductRepository
from app.services.order_service import OrderService

router = APIRouter(prefix="/admin/orders", tags=["admin:orders"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list)
async def admin_list_orders():
    return await OrderRepository.list_all()


@router.patch("/{order_number}")
async def admin_update_order(order_number: str, payload: OrderStatusUpdate):
    if payload.status not in VALID_ORDER_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {VALID_ORDER_STATUSES}")
    existing = await OrderRepository.get_by_order_number(order_number)
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")
    if payload.status != existing["status"] and payload.status not in ORDER_STATUS_TRANSITIONS.get(existing["status"], set()):
        raise HTTPException(status_code=400, detail=f"Cannot move an order from '{existing['status']}' to '{payload.status}'")
    if not await OrderRepository.update_status(order_number, payload.status):
        raise HTTPException(status_code=404, detail="Order not found")

    # Cancelling releases the stock that was decremented at order creation
    # (see OrderService.create) back into inventory. Only fires on the
    # transition INTO cancelled, not idempotently on every PATCH, so
    # re-saving an already-cancelled order can't double-restock it.
    if payload.status == "cancelled" and existing["status"] != "cancelled":
        quantities = defaultdict(int)
        for item in existing["items"]:
            quantities[item["product_id"]] += item["quantity"]
        await ProductRepository.restock(dict(quantities))

    order = await OrderRepository.get_by_order_number(order_number)
    await OrderService.notify_status_change(order, payload.status)
    return {"updated": True, "status": payload.status}
