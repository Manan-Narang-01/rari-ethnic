from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.models.exchange_request import (
    EXCHANGE_WINDOW_DAYS,
    VALID_EXCHANGE_STATUSES,
    ExchangeRequest,
    ExchangeRequestCreate,
    ExchangeRequestStatusUpdate,
)
from app.repositories.exchange_request_repo import ExchangeRequestRepository
from app.repositories.order_repo import OrderRepository


class ExchangeRequestService:
    @staticmethod
    async def create(order_number: str, user: dict, payload: ExchangeRequestCreate) -> ExchangeRequest:
        order = await OrderRepository.get_by_order_number(order_number)
        if not order or order.get("user_id") != user["id"]:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

        if order.get("status") != "delivered":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Exchanges can only be requested once an order is delivered",
            )

        delivered_at = order.get("delivered_at")
        if not delivered_at or datetime.now(timezone.utc) - delivered_at > timedelta(days=EXCHANGE_WINDOW_DAYS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The {EXCHANGE_WINDOW_DAYS}-day exchange window for this order has passed",
            )

        if await ExchangeRequestRepository.get_active_for_order(order["id"]):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An exchange request already exists for this order",
            )

        request = ExchangeRequest(
            order_id=order["id"],
            order_number=order["order_number"],
            user_id=user["id"],
            customer_name=order["customer_name"],
            email=order["email"],
            phone=order["phone"],
            order_total=order["total"],
            **payload.model_dump(),
        )
        doc = request.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await ExchangeRequestRepository.insert(doc)
        return request

    @staticmethod
    async def update_status(request_id: str, payload: ExchangeRequestStatusUpdate) -> dict:
        if payload.status not in VALID_EXCHANGE_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status must be one of {sorted(VALID_EXCHANGE_STATUSES)}",
            )
        updates = {"status": payload.status, "updated_at": datetime.now(timezone.utc).isoformat()}
        if payload.admin_note is not None:
            updates["admin_note"] = payload.admin_note

        if not await ExchangeRequestRepository.update(request_id, updates):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exchange request not found")
        return await ExchangeRequestRepository.get_by_id(request_id)
