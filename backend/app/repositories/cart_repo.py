from datetime import datetime, timezone

from app.database import get_database


class CartRepository:
    @staticmethod
    def _collection():
        return get_database().carts

    @classmethod
    async def get_by_user(cls, user_id: str) -> dict:
        return await cls._collection().find_one({"user_id": user_id}, {"_id": 0})

    @classmethod
    async def upsert(cls, user_id: str, items: list) -> dict:
        now = datetime.now(timezone.utc)
        doc = {"user_id": user_id, "items": items, "updated_at": now}
        await cls._collection().update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
        return doc

    @classmethod
    async def clear(cls, user_id: str) -> None:
        await cls._collection().delete_one({"user_id": user_id})

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("user_id", unique=True)
