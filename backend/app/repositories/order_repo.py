from datetime import datetime, timezone

from app.database import get_database


class OrderRepository:
    @staticmethod
    def _collection():
        return get_database().orders

    @classmethod
    async def insert(cls, doc: dict) -> None:
        await cls._collection().insert_one(doc)

    @classmethod
    async def get_by_order_number(cls, order_number: str) -> dict:
        doc = await cls._collection().find_one({"order_number": order_number}, {"_id": 0})
        return _coerce_created_at(doc) if doc else None

    @classmethod
    async def get_by_id(cls, order_id: str) -> dict:
        doc = await cls._collection().find_one({"id": order_id}, {"_id": 0})
        return _coerce_created_at(doc) if doc else None

    @classmethod
    async def list_all(cls) -> list:
        docs = await cls._collection().find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return [_coerce_created_at(d) for d in docs]

    @classmethod
    async def list_for_user(cls, user_id: str) -> list:
        docs = await cls._collection().find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
        return [_coerce_created_at(d) for d in docs]

    @classmethod
    async def update_by_order_number(cls, order_number: str, updates: dict) -> bool:
        r = await cls._collection().update_one({"order_number": order_number}, {"$set": updates})
        return r.matched_count > 0

    @classmethod
    async def update_status(cls, order_number: str, status: str) -> bool:
        updates = {"status": status}
        if status == "delivered":
            existing = await cls._collection().find_one({"order_number": order_number}, {"delivered_at": 1})
            if existing is not None and not existing.get("delivered_at"):
                updates["delivered_at"] = datetime.now(timezone.utc).isoformat()
        r = await cls._collection().update_one({"order_number": order_number}, {"$set": updates})
        return r.matched_count > 0

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("order_number", unique=True)
        await cls._collection().create_index("id", unique=True)
        await cls._collection().create_index("user_id")


def _coerce_created_at(doc: dict) -> dict:
    for field in ("created_at", "delivered_at"):
        if isinstance(doc.get(field), str):
            doc[field] = datetime.fromisoformat(doc[field])
    return doc
