from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.models.site_settings import SiteSettingsUpdate
from app.services.site_settings_service import SiteSettingsService

router = APIRouter(prefix="/admin", tags=["admin:settings"], dependencies=[Depends(require_admin)])


@router.get("/settings")
async def admin_get_settings():
    return await SiteSettingsService.get()


@router.put("/settings")
async def admin_update_settings(payload: SiteSettingsUpdate):
    return await SiteSettingsService.update(payload)
