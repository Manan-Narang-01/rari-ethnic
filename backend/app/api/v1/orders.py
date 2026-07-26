from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user_optional, require_customer
from app.models.order import Order, OrderCreate
from app.repositories.order_repo import OrderRepository
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])

customer_router = APIRouter(prefix="/customer/orders", tags=["customer:orders"])


@customer_router.get("", response_model=list)
async def list_my_orders(user: dict = Depends(require_customer)):
    return await OrderRepository.list_for_user(user["id"])


@router.post("", response_model=Order)
async def create_order(payload: OrderCreate, user: dict = Depends(get_current_user_optional)):
    return await OrderService.create(payload, user["id"] if user else None)


@router.get("/{order_number}", response_model=Order)
async def get_order(order_number: str):
    doc = await OrderRepository.get_by_order_number(order_number)
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return doc
