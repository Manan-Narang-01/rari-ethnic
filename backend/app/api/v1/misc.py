from fastapi import APIRouter, HTTPException

from app.models.misc import ContactCreate, ContactMessage, Subscriber, SubscribeCreate
from app.repositories.misc_repo import ContactMessageRepository, SubscriberRepository

router = APIRouter(tags=["misc"])


@router.post("/subscribe", response_model=Subscriber)
async def subscribe(payload: SubscribeCreate):
    if not payload.email and not payload.phone:
        raise HTTPException(status_code=400, detail="Provide email or phone")
    sub = Subscriber(**payload.model_dump())
    doc = sub.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await SubscriberRepository.insert(doc)
    return sub


@router.post("/contact", response_model=ContactMessage)
async def create_contact(payload: ContactCreate):
    msg = ContactMessage(**payload.model_dump())
    doc = msg.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await ContactMessageRepository.insert(doc)
    return msg
