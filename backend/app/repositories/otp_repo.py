import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from app.database import get_database

OTP_TTL_MINUTES = 10
MAX_ATTEMPTS = 5


def _hash(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


class OtpRepository:
    """Stores only a hash of the OTP (never the raw code), same reasoning as
    PasswordResetRepository -- a DB read shouldn't be able to forge a code.

    Also holds the pending registration payload (name/email/password_hash/phone)
    until the code is verified -- no user document is created until then, so an
    unverified signup never occupies a real account or a unique email slot."""

    @staticmethod
    def _collection():
        return get_database().otps

    @classmethod
    async def create(cls, email: str, registration: dict) -> str:
        # Normalized the same way as UserRepository -- callers may pass either
        # the raw form input or an already-lowercased email, and both must
        # resolve to the same record.
        email = email.strip().lower()
        code = f"{secrets.randbelow(1000000):06d}"
        await cls._collection().delete_many({"email": email})  # invalidate any earlier attempt
        await cls._collection().insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "code_hash": _hash(code),
            "registration": registration,
            "attempts": 0,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
            "used": False,
            "created_at": datetime.now(timezone.utc),
        })
        return code

    @classmethod
    async def get_pending(cls, email: str) -> dict:
        """The not-yet-verified registration record for `email`, for resending
        the code -- or None if there's no pending signup for it."""
        email = email.strip().lower()
        return await cls._collection().find_one({"email": email, "used": False}, {"_id": 0})

    @classmethod
    async def verify(cls, email: str, code: str) -> dict:
        """Returns the stored registration payload on success, or None on any
        failure (wrong code, expired, too many attempts, nothing pending)."""
        email = email.strip().lower()
        record = await cls._collection().find_one({"email": email, "used": False})
        if not record:
            return None
        expires_at = record["expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc) or record.get("attempts", 0) >= MAX_ATTEMPTS:
            return None
        if record["code_hash"] != _hash(code):
            await cls._collection().update_one({"id": record["id"]}, {"$inc": {"attempts": 1}})
            return None
        await cls._collection().update_one({"id": record["id"]}, {"$set": {"used": True}})
        return record.get("registration")

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("email")
        await cls._collection().create_index("expires_at", expireAfterSeconds=0)
