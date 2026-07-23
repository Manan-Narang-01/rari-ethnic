from datetime import datetime, timezone

from app.database import get_database


class SessionRepository:
    """Tracks issued refresh tokens so they can be revoked (logout, password reset,
    role change) without waiting for natural JWT expiry."""

    @staticmethod
    def _collection():
        return get_database().refresh_sessions

    @classmethod
    async def create(cls, *, jti: str, user_id: str, expires_at: datetime) -> None:
        await cls._collection().insert_one({
            "jti": jti,
            "user_id": user_id,
            # Stored as a real datetime (not ISO string, unlike the rest of the app)
            # because the Mongo TTL index below requires a BSON date type.
            "expires_at": expires_at,
            "revoked": False,
            "created_at": datetime.now(timezone.utc),
        })

    @classmethod
    async def get(cls, jti: str) -> dict:
        return await cls._collection().find_one({"jti": jti}, {"_id": 0})

    @classmethod
    async def revoke(cls, jti: str) -> None:
        await cls._collection().update_one({"jti": jti}, {"$set": {"revoked": True}})

    @classmethod
    async def revoke_all_for_user(cls, user_id: str) -> None:
        await cls._collection().update_many({"user_id": user_id}, {"$set": {"revoked": True}})

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("jti", unique=True)
        await cls._collection().create_index("expires_at", expireAfterSeconds=0)
