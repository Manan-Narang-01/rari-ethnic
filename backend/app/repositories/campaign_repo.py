from datetime import datetime

from app.database import get_database


class CampaignRepository:
    @staticmethod
    def _collection():
        return get_database().campaigns

    @classmethod
    async def list_all(cls) -> list:
        docs = await cls._collection().find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
        return [_coerce_dates(d) for d in docs]

    @classmethod
    async def get_by_id(cls, campaign_id: str) -> dict:
        doc = await cls._collection().find_one({"id": campaign_id}, {"_id": 0})
        return _coerce_dates(doc) if doc else None

    @classmethod
    async def get_active(cls) -> dict:
        doc = await cls._collection().find_one({"is_active": True}, {"_id": 0})
        return _coerce_dates(doc) if doc else None

    @classmethod
    async def insert(cls, doc: dict) -> None:
        await cls._collection().insert_one(doc)

    @classmethod
    async def update(cls, campaign_id: str, updates: dict) -> bool:
        r = await cls._collection().update_one({"id": campaign_id}, {"$set": updates})
        return r.matched_count > 0

    @classmethod
    async def delete(cls, campaign_id: str) -> bool:
        r = await cls._collection().delete_one({"id": campaign_id})
        return r.deleted_count > 0

    @classmethod
    async def deactivate_all(cls, exclude_id: str = None) -> None:
        query = {"id": {"$ne": exclude_id}} if exclude_id else {}
        await cls._collection().update_many(query, {"$set": {"is_active": False}})

    @classmethod
    async def backfill_defaults(cls) -> None:
        """Migrates the old rigid `day_colors` field into the generic
        `attribute_groups` structure as a single 'Day Colours' group, so
        Navratri events configured before this migration keep their data."""
        async for doc in cls._collection().find({"day_colors": {"$exists": True}}):
            day_colors = doc.get("day_colors") or []
            groups = doc.get("attribute_groups") or []
            if day_colors:
                items = [
                    {
                        "order": d.get("day", 0),
                        "title": d.get("name", ""),
                        "subtitle": "",
                        "description": d.get("meaning", ""),
                        "color": d.get("hex"),
                        "icon": None,
                    }
                    for d in day_colors
                ]
                groups = groups + [{"key": "day-colours", "title": "Day Colours", "items": items}]
            await cls._collection().update_one(
                {"_id": doc["_id"]},
                {"$set": {"attribute_groups": groups}, "$unset": {"day_colors": ""}},
            )

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("id", unique=True)
        await cls._collection().create_index("is_active")


def _coerce_dates(doc: dict) -> dict:
    for field in ("created_at", "countdown_target"):
        if isinstance(doc.get(field), str):
            doc[field] = datetime.fromisoformat(doc[field])
    return doc
