from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_admin
from app.models.order import VALID_ORDER_STATUSES, Order, OrderStatusUpdate
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
    if not await OrderRepository.update_status(order_number, payload.status):
        raise HTTPException(status_code=404, detail="Order not found")
    order = await OrderRepository.get_by_order_number(order_number)
    await OrderService.notify_status_change(order, payload.status)
    return {"updated": True, "status": payload.status}
