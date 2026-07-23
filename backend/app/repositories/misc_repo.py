from app.database import get_database


class SubscriberRepository:
    @staticmethod
    def _collection():
        return get_database().subscribers

    @classmethod
    async def insert(cls, doc: dict) -> None:
        await cls._collection().insert_one(doc)

    @classmethod
    async def list_all(cls) -> list:
        return await cls._collection().find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)


class ContactMessageRepository:
    @staticmethod
    def _collection():
        return get_database().contact_messages

    @classmethod
    async def insert(cls, doc: dict) -> None:
        await cls._collection().insert_one(doc)

    @classmethod
    async def list_all(cls) -> list:
        return await cls._collection().find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
