from datetime import datetime, timezone

from app.database import get_session
from app.db.base import coerce_datetimes, row_to_dict
from app.db.models import SiteSettingsRow
from app.models.site_settings import SiteSettings

SETTINGS_ID = "site"
_DATETIME_FIELDS = {"updated_at"}


class SiteSettingsRepository:
    @classmethod
    async def get(cls) -> dict:
        async with get_session() as session:
            row = await session.get(SiteSettingsRow, SETTINGS_ID)
            return row_to_dict(row)

    @classmethod
    async def update(cls, updates: dict) -> dict:
        updates = dict(updates)
        updates["updated_at"] = datetime.now(timezone.utc)
        updates = coerce_datetimes(updates, _DATETIME_FIELDS)
        async with get_session() as session:
            row = await session.get(SiteSettingsRow, SETTINGS_ID)
            if row is None:
                defaults = SiteSettings().model_dump()
                defaults.update(updates)
                row = SiteSettingsRow(**defaults)
                session.add(row)
            else:
                for key, value in updates.items():
                    setattr(row, key, value)
            await session.commit()
        return await cls.get()

    @classmethod
    async def ensure_defaults(cls) -> None:
        """Seeds the singleton settings row. No-op once it exists."""
        async with get_session() as session:
            existing = await session.get(SiteSettingsRow, SETTINGS_ID)
            if existing is not None:
                return
            row = SiteSettingsRow(**SiteSettings().model_dump())
            session.add(row)
            await session.commit()

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass

    @classmethod
    async def backfill_instagram_tiles(cls) -> None:
        """instagram_tiles used to be a plain list of image URL strings; it's
        now a list of {image, post_url} objects so each tile can link to its
        real Instagram post. Rewrites any old-shape string entries in place."""
        async with get_session() as session:
            row = await session.get(SiteSettingsRow, SETTINGS_ID)
            if not row:
                return
            tiles = row.instagram_tiles or []
            if not any(isinstance(t, str) for t in tiles):
                return
            row.instagram_tiles = [{"image": t, "post_url": None} if isinstance(t, str) else t for t in tiles]
            await session.commit()
