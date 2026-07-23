import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from app.database import get_database

RESET_TOKEN_TTL_MINUTES = 30


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class PasswordResetRepository:
    """Stores only a hash of the reset token (never the raw value) so a DB
    read can't be used to forge a reset link."""

    @staticmethod
    def _collection():
        return get_database().password_resets

    @classmethod
    async def create(cls, *, user_id: str) -> str:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
        await cls._collection().insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "token_hash": _hash(raw_token),
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.now(timezone.utc),
        })
        return raw_token

    @classmethod
    async def consume(cls, raw_token: str) -> dict:
        """Validates + marks the token used in one step. Returns None if invalid,
        already used, or expired."""
        record = await cls._collection().find_one({"token_hash": _hash(raw_token), "used": False})
        if not record:
            return None
        expires_at = record["expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return None
        await cls._collection().update_one({"id": record["id"]}, {"$set": {"used": True}})
        return record

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("token_hash")
        await cls._collection().create_index("expires_at", expireAfterSeconds=0)
