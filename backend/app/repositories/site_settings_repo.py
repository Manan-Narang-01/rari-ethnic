from datetime import datetime, timezone

from app.database import get_database
from app.models.site_settings import SiteSettings

SETTINGS_ID = "site"


class SiteSettingsRepository:
    @staticmethod
    def _collection():
        return get_database().settings

    @classmethod
    async def get(cls) -> dict:
        doc = await cls._collection().find_one({"id": SETTINGS_ID}, {"_id": 0})
        return _coerce_updated_at(doc) if doc else None

    @classmethod
    async def update(cls, updates: dict) -> dict:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await cls._collection().update_one({"id": SETTINGS_ID}, {"$set": updates}, upsert=True)
        return await cls.get()

    @classmethod
    async def ensure_defaults(cls) -> None:
        """Seeds the singleton settings document. No-op once it exists."""
        if await cls._collection().find_one({"id": SETTINGS_ID}) is not None:
            return
        doc = SiteSettings().model_dump()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await cls._collection().insert_one(doc)

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("id", unique=True)


def _coerce_updated_at(doc: dict) -> dict:
    if isinstance(doc.get("updated_at"), str):
        doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
    return doc
