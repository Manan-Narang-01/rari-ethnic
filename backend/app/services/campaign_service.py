import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.models.campaign import SECTION_TYPES, Campaign, CampaignCreate, CampaignUpdate
from app.repositories.campaign_repo import CampaignAuditLogRepository, CampaignRepository


def _json_safe(value):
    """JSONB-storable form of a value that may contain datetimes (from
    countdown_target) nested inside dicts/lists."""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    return value


def _validate_sections(sections) -> None:
    for s in sections:
        section_type = s.get("type") if isinstance(s, dict) else s.type
        if section_type not in SECTION_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown section type: {section_type}")


def _diff(existing: dict, updates: dict) -> dict:
    """Field-level before/after diff -- one entry per top-level Campaign field
    that actually changed. `sections` diffs as one field (old list vs new
    list), not exploded per-block -- that's the granularity CampaignUpdate
    itself operates at, and matches what an admin actually did in one save."""
    changes = {}
    for key, new_value in updates.items():
        old_value = _json_safe(existing.get(key))
        new_value = _json_safe(new_value)
        if old_value != new_value:
            changes[key] = {"old": old_value, "new": new_value}
    return changes


async def _log(*, campaign_id: str, campaign_name: str, actor: dict, action: str, changes: dict) -> None:
    await CampaignAuditLogRepository.insert({
        "id": str(uuid.uuid4()),
        "campaign_id": campaign_id,
        "campaign_name": campaign_name,
        "actor_id": actor["id"],
        "actor_name": actor.get("name", ""),
        "actor_email": actor.get("email", ""),
        "action": action,
        "changes": changes,
        "created_at": datetime.now(timezone.utc),
    })


class CampaignService:
    @staticmethod
    async def create(payload: CampaignCreate, actor: dict) -> Campaign:
        data = payload.model_dump()
        _validate_sections(data["sections"])
        campaign = Campaign(**data)
        doc = campaign.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc["countdown_target"] is not None:
            doc["countdown_target"] = doc["countdown_target"].isoformat()

        await CampaignRepository.insert(doc, deactivate_others=campaign.is_active)

        created_changes = {k: {"old": None, "new": v} for k, v in _json_safe(doc).items() if k not in ("id", "created_at")}
        await _log(campaign_id=campaign.id, campaign_name=campaign.name, actor=actor, action="created", changes=created_changes)
        return campaign

    @staticmethod
    async def update(campaign_id: str, payload: CampaignUpdate, actor: dict) -> dict:
        existing = await CampaignRepository.get_by_id(campaign_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

        updates = payload.model_dump(exclude_unset=True)
        if "sections" in updates:
            _validate_sections(updates["sections"])
        if "countdown_target" in updates and updates["countdown_target"] is not None:
            updates["countdown_target"] = updates["countdown_target"].isoformat()

        if not await CampaignRepository.update(campaign_id, updates, deactivate_others=updates.get("is_active") is True):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

        changes = _diff(existing, updates)
        if changes:
            await _log(
                campaign_id=campaign_id, campaign_name=updates.get("name", existing["name"]),
                actor=actor, action="updated", changes=changes,
            )
        return await CampaignRepository.get_by_id(campaign_id)

    @staticmethod
    async def delete(campaign_id: str, actor: dict) -> None:
        existing = await CampaignRepository.get_by_id(campaign_id)
        if not existing or not await CampaignRepository.delete(campaign_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

        deleted_changes = {k: {"old": v, "new": None} for k, v in _json_safe(existing).items() if k != "id"}
        await _log(campaign_id=campaign_id, campaign_name=existing["name"], actor=actor, action="deleted", changes=deleted_changes)
