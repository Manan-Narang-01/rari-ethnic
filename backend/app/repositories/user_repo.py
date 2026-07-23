import uuid
from datetime import datetime, timezone

from app.database import get_database


class UserRepository:
    @staticmethod
    def _collection():
        return get_database().users

    @classmethod
    async def get_by_email(cls, email: str) -> dict:
        return await cls._collection().find_one({"email": email.strip().lower()}, {"_id": 0})

    @classmethod
    async def get_by_id(cls, user_id: str) -> dict:
        return await cls._collection().find_one({"id": user_id}, {"_id": 0})

    @classmethod
    async def create(cls, *, name: str, email: str, password_hash: str = None, role: str = "customer",
                      phone: str = None, email_verified: bool = False, picture: str = None,
                      google_sub: str = None) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email.strip().lower(),
            "phone": phone,
            "password_hash": password_hash,
            "role": role,
            "is_active": True,
            "email_verified": email_verified,
            "picture": picture,
            "google_sub": google_sub,
            "created_at": now,
            "updated_at": now,
        }
        await cls._collection().insert_one(doc)
        doc.pop("_id", None)
        return doc

    @classmethod
    async def update_password(cls, user_id: str, password_hash: str) -> None:
        await cls._collection().update_one(
            {"id": user_id},
            {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc).isoformat()}},
        )

    @classmethod
    async def update_google_profile(cls, user_id: str, *, name: str = None, picture: str = None,
                                     google_sub: str = None) -> None:
        updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if name:
            updates["name"] = name
        if picture:
            updates["picture"] = picture
        if google_sub:
            updates["google_sub"] = google_sub
        await cls._collection().update_one({"id": user_id}, {"$set": updates})

    @classmethod
    async def backfill_defaults(cls) -> None:
        """Bring users seeded by the pre-RBAC single-admin flow up to the current schema."""
        now = datetime.now(timezone.utc).isoformat()
        await cls._collection().update_many(
            {"is_active": {"$exists": False}}, {"$set": {"is_active": True}}
        )
        await cls._collection().update_many(
            {"name": {"$exists": False}}, {"$set": {"name": "Admin"}}
        )
        await cls._collection().update_many(
            {"email_verified": {"$exists": False}}, {"$set": {"email_verified": True}}
        )
        await cls._collection().update_many(
            {"updated_at": {"$exists": False}}, {"$set": {"updated_at": now}}
        )
        await cls._collection().update_many(
            {"phone": {"$exists": False}}, {"$set": {"phone": None}}
        )

    @classmethod
    async def ensure_indexes(cls) -> None:
        await cls._collection().create_index("email", unique=True)
        await cls._collection().create_index("id", unique=True)
