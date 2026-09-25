from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_admin
from app.models.campaign import Campaign, CampaignCreate, CampaignUpdate
from app.repositories.campaign_repo import CampaignAuditLogRepository, CampaignRepository
from app.services.campaign_service import CampaignService

router = APIRouter(prefix="/admin/campaigns", tags=["admin:campaigns"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list)
async def admin_list_campaigns():
    return await CampaignRepository.list_all()


@router.get("/logs", response_model=list)
async def admin_list_all_campaign_logs():
    """Global activity feed across every event, including deleted ones
    (identified by the denormalized campaign_name, since campaign_id no
    longer resolves to a live row once its campaign is deleted)."""
    return await CampaignAuditLogRepository.list_all()


@router.get("/{campaign_id}", response_model=Campaign)
async def admin_get_campaign(campaign_id: str):
    campaign = await CampaignRepository.get_by_id(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.get("/{campaign_id}/logs", response_model=list)
async def admin_get_campaign_logs(campaign_id: str):
    return await CampaignAuditLogRepository.list_for_campaign(campaign_id)


@router.post("", response_model=Campaign)
async def admin_create_campaign(payload: CampaignCreate, user: dict = Depends(require_admin)):
    return await CampaignService.create(payload, actor=user)


@router.put("/{campaign_id}", response_model=Campaign)
async def admin_update_campaign(campaign_id: str, payload: CampaignUpdate, user: dict = Depends(require_admin)):
    return await CampaignService.update(campaign_id, payload, actor=user)


@router.delete("/{campaign_id}")
async def admin_delete_campaign(campaign_id: str, user: dict = Depends(require_admin)):
    await CampaignService.delete(campaign_id, actor=user)
    return {"deleted": True}
