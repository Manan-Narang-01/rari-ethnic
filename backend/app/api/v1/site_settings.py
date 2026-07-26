from fastapi import APIRouter

from app.services.site_settings_service import SiteSettingsService

router = APIRouter(tags=["settings"])


@router.get("/settings")
async def get_settings():
    return await SiteSettingsService.get()
