from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None


def connect() -> None:
    global _client, _db
    _client = AsyncIOMotorClient(settings.mongo_url)
    _db = _client[settings.db_name]


def close() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get_database() -> AsyncIOMotorDatabase:
    if _db is None:
        connect()
    return _db
