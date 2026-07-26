from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.models.exchange_request import ExchangeRequestStatusUpdate
from app.repositories.exchange_request_repo import ExchangeRequestRepository
from app.services.exchange_request_service import ExchangeRequestService

router = APIRouter(prefix="/admin/exchange-requests", tags=["admin:exchange-requests"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list)
async def admin_list_exchange_requests():
    return await ExchangeRequestRepository.list_all()


@router.put("/{request_id}")
async def admin_update_exchange_request(request_id: str, payload: ExchangeRequestStatusUpdate):
    return await ExchangeRequestService.update_status(request_id, payload)
