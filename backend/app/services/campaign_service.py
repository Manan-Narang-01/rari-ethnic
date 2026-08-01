from fastapi import HTTPException, status

from app.models.campaign import Campaign, CampaignCreate, CampaignUpdate
from app.repositories.campaign_repo import CampaignRepository
from app.utils.slugify import slugify


def _normalize_groups(groups: list) -> list:
    """Auto-slugifies any attribute group missing a key, from its title,
    deduping against sibling keys within the same campaign (mirrors the same
    pattern used for custom payment/shipping provider fields)."""
    used = set()
    result = []
    for g in groups:
        data = g.model_dump()
        key = data.get("key") or slugify(data.get("title", "")) or "group"
        base, i = key, 2
        while key in used:
            key = f"{base}-{i}"
            i += 1
        used.add(key)
        data["key"] = key
        result.append(data)
    return result


class CampaignService:
    @staticmethod
    async def create(payload: CampaignCreate) -> Campaign:
        data = payload.model_dump()
        data["attribute_groups"] = _normalize_groups(payload.attribute_groups)
        campaign = Campaign(**data)
        doc = campaign.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc["countdown_target"] is not None:
            doc["countdown_target"] = doc["countdown_target"].isoformat()

        if campaign.is_active:
            await CampaignRepository.deactivate_all()
        await CampaignRepository.insert(doc)
        return campaign

    @staticmethod
    async def update(campaign_id: str, payload: CampaignUpdate) -> dict:
        updates = payload.model_dump(exclude_unset=True)
        if "countdown_target" in updates and updates["countdown_target"] is not None:
            updates["countdown_target"] = updates["countdown_target"].isoformat()
        if payload.attribute_groups is not None:
            updates["attribute_groups"] = _normalize_groups(payload.attribute_groups)

        if updates.get("is_active") is True:
            await CampaignRepository.deactivate_all(exclude_id=campaign_id)

        if not await CampaignRepository.update(campaign_id, updates):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
        return await CampaignRepository.get_by_id(campaign_id)

    @staticmethod
    async def delete(campaign_id: str) -> None:
        if not await CampaignRepository.delete(campaign_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
