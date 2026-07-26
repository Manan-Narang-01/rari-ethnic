from fastapi import APIRouter, Depends

from app.api.deps import require_customer
from app.models.exchange_request import ExchangeRequest, ExchangeRequestCreate
from app.repositories.exchange_request_repo import ExchangeRequestRepository
from app.services.exchange_request_service import ExchangeRequestService

router = APIRouter(tags=["customer:exchange-requests"])


@router.post("/customer/orders/{order_number}/exchange-requests", response_model=ExchangeRequest)
async def create_exchange_request(
    order_number: str, payload: ExchangeRequestCreate, user: dict = Depends(require_customer)
):
    return await ExchangeRequestService.create(order_number, user, payload)


@router.get("/customer/exchange-requests", response_model=list)
async def list_my_exchange_requests(user: dict = Depends(require_customer)):
    return await ExchangeRequestRepository.list_for_user(user["id"])
