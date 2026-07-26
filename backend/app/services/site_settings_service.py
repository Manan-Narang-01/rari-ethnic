from app.models.site_settings import SiteSettingsUpdate
from app.repositories.site_settings_repo import SiteSettingsRepository


class SiteSettingsService:
    @staticmethod
    async def get() -> dict:
        settings = await SiteSettingsRepository.get()
        if settings is None:
            await SiteSettingsRepository.ensure_defaults()
            settings = await SiteSettingsRepository.get()
        return settings

    @staticmethod
    async def update(payload: SiteSettingsUpdate) -> dict:
        updates = payload.model_dump(exclude_unset=True)
        return await SiteSettingsRepository.update(updates)
