from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_admin
from app.models.order import ORDER_STATUS_TRANSITIONS, VALID_ORDER_STATUSES, Order, OrderStatusUpdate
from app.repositories.order_repo import OrderRepository
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

    is_new_cancellation = payload.status == "cancelled" and existing["status"] != "cancelled"
    # On a cancellation specifically, this is a compare-and-swap keyed off
    # the status this admin actually saw -- the automatic pending_payment
    # expiry sweep (OrderService.expire_stale_pending_payments) could be
    # cancelling this exact order at the same instant, and only whichever
    # transition wins the row should restock (see restock_cancelled_order).
    updated = await OrderRepository.update_status(
        order_number, payload.status,
        expected_status=existing["status"] if is_new_cancellation else None,
    )
    if not updated:
        if is_new_cancellation:
            raise HTTPException(status_code=409, detail="This order was just updated elsewhere -- please refresh and try again")
        raise HTTPException(status_code=404, detail="Order not found")

    if is_new_cancellation:
        await OrderService.restock_cancelled_order(existing)

    order = await OrderRepository.get_by_order_number(order_number)
    await OrderService.notify_status_change(order, payload.status)
    return {"updated": True, "status": payload.status}
