from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user_optional
from app.models.order import Order, OrderCreate
from app.repositories.order_repo import OrderRepository

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=Order)
async def create_order(payload: OrderCreate, user: dict = Depends(get_current_user_optional)):
    order = Order(**payload.model_dump(), user_id=user["id"] if user else None)
    doc = order.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["items"] = [i if isinstance(i, dict) else i.model_dump() for i in doc["items"]]
    await OrderRepository.insert(doc)
    return order


@router.get("/{order_number}", response_model=Order)
async def get_order(order_number: str):
    doc = await OrderRepository.get_by_order_number(order_number)
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return doc
