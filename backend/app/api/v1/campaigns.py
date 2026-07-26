from fastapi import APIRouter

from app.repositories.campaign_repo import CampaignRepository

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/active")
async def get_active_campaign():
    return await CampaignRepository.get_active()
