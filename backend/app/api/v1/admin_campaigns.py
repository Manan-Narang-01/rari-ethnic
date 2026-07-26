from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_admin
from app.models.campaign import Campaign, CampaignCreate, CampaignUpdate
from app.repositories.campaign_repo import CampaignRepository
from app.services.campaign_service import CampaignService

router = APIRouter(prefix="/admin/campaigns", tags=["admin:campaigns"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list)
async def admin_list_campaigns():
    return await CampaignRepository.list_all()


@router.get("/{campaign_id}", response_model=Campaign)
async def admin_get_campaign(campaign_id: str):
    campaign = await CampaignRepository.get_by_id(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.post("", response_model=Campaign)
async def admin_create_campaign(payload: CampaignCreate):
    return await CampaignService.create(payload)


@router.put("/{campaign_id}", response_model=Campaign)
async def admin_update_campaign(campaign_id: str, payload: CampaignUpdate):
    return await CampaignService.update(campaign_id, payload)


@router.delete("/{campaign_id}")
async def admin_delete_campaign(campaign_id: str):
    await CampaignService.delete(campaign_id)
    return {"deleted": True}
