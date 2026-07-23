from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.repositories.misc_repo import ContactMessageRepository, SubscriberRepository

router = APIRouter(prefix="/admin", tags=["admin:misc"], dependencies=[Depends(require_admin)])


@router.get("/subscribers")
async def admin_list_subscribers():
    return await SubscriberRepository.list_all()


@router.get("/contact-messages")
async def admin_list_contact():
    return await ContactMessageRepository.list_all()
