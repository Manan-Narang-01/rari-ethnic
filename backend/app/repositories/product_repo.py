from datetime import datetime

from app.database import get_database


class ProductRepository:
    @staticmethod
    def _collection():
        return get_database().products

    @classmethod
    async def list_public(cls, *, category: str = None, is_bestseller: bool = None,
                           is_navratri: bool = None, is_new: bool = None) -> list:
        query = {"is_active": {"$ne": False}}
        if category:
            query["category"] = category
        if is_bestseller is not None:
            query["is_bestseller"] = is_bestseller
        if is_navratri is not None:
            query["is_navratri"] = is_navratri
        if is_new is not None:
            query["is_new"] = is_new
        docs = await cls._collection().find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        return [_coerce_created_at(d) for d in docs]

    @classmethod
    async def list_all(cls) -> list:
        docs = await cls._collection().find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return [_coerce_created_at(d) for d in docs]

    @classmethod
    async def get_by_slug(cls, slug: str) -> dict:
        doc = await cls._collection().find_one({"slug": slug}, {"_id": 0})
        return _coerce_created_at(doc) if doc else None

    @classmethod
    async def get_by_id(cls, product_id: str) -> dict:
        doc = await cls._collection().find_one({"id": product_id}, {"_id": 0})
        return _coerce_created_at(doc) if doc else None

    @classmethod
    async def slug_exists(cls, slug: str, *, exclude_id: str = None) -> bool:
        query = {"slug": slug}
        if exclude_id:
            query["id"] = {"$ne": exclude_id}
        return await cls._collection().find_one(query) is not None

    @classmethod
    async def insert(cls, doc: dict) -> None:
        await cls._collection().insert_one(doc)

    @classmethod
    async def update(cls, product_id: str, updates: dict) -> bool:
        r = await cls._collection().update_one({"id": product_id}, {"$set": updates})
        return r.matched_count > 0

    @classmethod
    async def delete(cls, product_id: str) -> bool:
        r = await cls._collection().delete_one({"id": product_id})
        return r.deleted_count > 0

    @classmethod
    async def backfill_defaults(cls) -> None:
        await cls._collection().update_many({"is_active": {"$exists": False}}, {"$set": {"is_active": True}})

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("slug", unique=True)
        await cls._collection().create_index("id", unique=True)
        await cls._collection().create_index("category")


def _coerce_created_at(doc: dict) -> dict:
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc
