import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update

from app.database import get_session
from app.db.base import row_to_dict
from app.db.models import UserRow


class UserRepository:
    @classmethod
    async def get_by_email(cls, email: str) -> dict:
        async with get_session() as session:
            row = await session.scalar(select(UserRow).where(UserRow.email == email.strip().lower()))
            return row_to_dict(row)

    @classmethod
    async def get_by_id(cls, user_id: str) -> dict:
        async with get_session() as session:
            row = await session.get(UserRow, user_id)
            return row_to_dict(row)

    @classmethod
    async def create(cls, *, name: str, email: str, password_hash: str = None, role: str = "customer",
                      phone: str = None, email_verified: bool = False, picture: str = None,
                      google_sub: str = None) -> dict:
        now = datetime.now(timezone.utc)
        row = UserRow(
            id=str(uuid.uuid4()), name=name, email=email.strip().lower(), phone=phone,
            password_hash=password_hash, role=role, is_active=True, email_verified=email_verified,
            picture=picture, google_sub=google_sub, created_at=now, updated_at=now,
        )
        async with get_session() as session:
            session.add(row)
            await session.commit()
            return row_to_dict(row)

    @classmethod
    async def update_password(cls, user_id: str, password_hash: str) -> None:
        async with get_session() as session:
            await session.execute(
                update(UserRow).where(UserRow.id == user_id)
                .values(password_hash=password_hash, updated_at=datetime.now(timezone.utc))
            )
            await session.commit()

    @classmethod
    async def mark_email_verified(cls, user_id: str) -> None:
        async with get_session() as session:
            await session.execute(
                update(UserRow).where(UserRow.id == user_id)
                .values(email_verified=True, updated_at=datetime.now(timezone.utc))
            )
            await session.commit()

    @classmethod
    async def update_google_profile(cls, user_id: str, *, name: str = None, picture: str = None,
                                     google_sub: str = None) -> None:
        values = {"updated_at": datetime.now(timezone.utc)}
        if name:
            values["name"] = name
        if picture:
            values["picture"] = picture
        if google_sub:
            values["google_sub"] = google_sub
        async with get_session() as session:
            await session.execute(update(UserRow).where(UserRow.id == user_id).values(**values))
            await session.commit()

    @classmethod
    async def list_staff_emails(cls) -> list:
        """Admin + Super Admin email addresses, for notification fan-out."""
        async with get_session() as session:
            rows = (await session.scalars(
                select(UserRow.email).where(UserRow.role.in_(["admin", "super_admin"]), UserRow.is_active.is_(True))
            )).all()
            return [r for r in rows if r]

    @classmethod
    async def backfill_defaults(cls) -> None:
        """No-op on Postgres: this only ever migrated documents from before
        these columns existed in Mongo's schemaless documents -- the Postgres
        schema (created by Alembic) already has every column NOT NULL with a
        default, so there's nothing to backfill."""
        pass

    @classmethod
    async def ensure_indexes(cls) -> None:
        """No-op on Postgres: indexes/constraints are created by the Alembic
        migration, not at application boot."""
        pass
