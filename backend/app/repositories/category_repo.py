import uuid
from datetime import datetime, timezone

from app.database import get_database

DEFAULT_CATEGORIES = [
    {"key": "kurtis", "name": "Kurtis", "sort_order": 1},
    {"key": "suits", "name": "Suits", "sort_order": 2},
    {"key": "lehengas", "name": "Lehengas", "sort_order": 3},
]


class CategoryRepository:
    @staticmethod
    def _collection():
        return get_database().categories

    @classmethod
    async def list_public(cls) -> list:
        docs = await cls._collection().find({"is_active": {"$ne": False}}, {"_id": 0}).sort("sort_order", 1).to_list(200)
        return [_coerce_created_at(d) for d in docs]

    @classmethod
    async def list_all(cls) -> list:
        docs = await cls._collection().find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)
        return [_coerce_created_at(d) for d in docs]

    @classmethod
    async def get_by_key(cls, key: str) -> dict:
        doc = await cls._collection().find_one({"key": key}, {"_id": 0})
        return _coerce_created_at(doc) if doc else None

    @classmethod
    async def get_by_id(cls, category_id: str) -> dict:
        doc = await cls._collection().find_one({"id": category_id}, {"_id": 0})
        return _coerce_created_at(doc) if doc else None

    @classmethod
    async def key_exists(cls, key: str, *, exclude_id: str = None) -> bool:
        query = {"key": key}
        if exclude_id:
            query["id"] = {"$ne": exclude_id}
        return await cls._collection().find_one(query) is not None

    @classmethod
    async def insert(cls, doc: dict) -> None:
        await cls._collection().insert_one(doc)

    @classmethod
    async def update(cls, category_id: str, updates: dict) -> bool:
        r = await cls._collection().update_one({"id": category_id}, {"$set": updates})
        return r.matched_count > 0

    @classmethod
    async def delete(cls, category_id: str) -> bool:
        r = await cls._collection().delete_one({"id": category_id})
        return r.deleted_count > 0

    @classmethod
    async def ensure_defaults(cls) -> None:
        """Seeds the categories the existing product catalog already assumes
        (kurtis/suits/lehengas), so pre-existing products never end up
        referencing a category that doesn't exist. No-op once anything exists."""
        if await cls._collection().count_documents({}) > 0:
            return
        now = datetime.now(timezone.utc).isoformat()
        docs = [
            {
                "id": str(uuid.uuid4()), "key": c["key"], "name": c["name"], "description": "",
                "image": None, "sort_order": c["sort_order"], "is_active": True,
                "show_in_navbar": True, "show_in_catalog": True, "created_at": now,
            }
            for c in DEFAULT_CATEGORIES
        ]
        await cls._collection().insert_many(docs)

    @classmethod
    async def backfill_defaults(cls) -> None:
        """Brings categories created before show_in_navbar/show_in_catalog existed
        up to the current schema (same pattern as ProductRepository/UserRepository)."""
        await cls._collection().update_many({"show_in_navbar": {"$exists": False}}, {"$set": {"show_in_navbar": True}})
        await cls._collection().update_many({"show_in_catalog": {"$exists": False}}, {"$set": {"show_in_catalog": True}})

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("key", unique=True)
        await cls._collection().create_index("id", unique=True)
        await cls._collection().create_index([("is_active", 1), ("sort_order", 1)])


def _coerce_created_at(doc: dict) -> dict:
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc
