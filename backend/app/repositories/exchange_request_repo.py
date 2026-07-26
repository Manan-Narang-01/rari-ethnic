from datetime import datetime

from app.database import get_database


class ExchangeRequestRepository:
    @staticmethod
    def _collection():
        return get_database().exchange_requests

    @classmethod
    async def insert(cls, doc: dict) -> None:
        await cls._collection().insert_one(doc)

    @classmethod
    async def get_by_id(cls, request_id: str) -> dict:
        doc = await cls._collection().find_one({"id": request_id}, {"_id": 0})
        return _coerce_dates(doc) if doc else None

    @classmethod
    async def get_active_for_order(cls, order_id: str) -> dict:
        """An existing request that isn't rejected -- used to block duplicate
        requests for the same order while one is pending/approved/completed."""
        doc = await cls._collection().find_one(
            {"order_id": order_id, "status": {"$ne": "rejected"}}, {"_id": 0}
        )
        return _coerce_dates(doc) if doc else None

    @classmethod
    async def list_for_user(cls, user_id: str) -> list:
        docs = await cls._collection().find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
        return [_coerce_dates(d) for d in docs]

    @classmethod
    async def list_all(cls) -> list:
        docs = await cls._collection().find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return [_coerce_dates(d) for d in docs]

    @classmethod
    async def update(cls, request_id: str, updates: dict) -> bool:
        r = await cls._collection().update_one({"id": request_id}, {"$set": updates})
        return r.matched_count > 0

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("id", unique=True)
        await cls._collection().create_index("order_id")
        await cls._collection().create_index("user_id")


def _coerce_dates(doc: dict) -> dict:
    for field in ("created_at", "updated_at"):
        if isinstance(doc.get(field), str):
            doc[field] = datetime.fromisoformat(doc[field])
    return doc
