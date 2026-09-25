import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update

from app.database import get_session
from app.db.base import row_to_dict
from app.db.models import PasswordResetRow

RESET_TOKEN_TTL_MINUTES = 30


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class PasswordResetRepository:
    """Stores only a hash of the reset token (never the raw value) so a DB
    read can't be used to forge a reset link."""

    @classmethod
    async def create(cls, *, user_id: str) -> str:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
        row = PasswordResetRow(
            id=str(uuid.uuid4()), user_id=user_id, token_hash=_hash(raw_token),
            expires_at=expires_at, used=False, created_at=datetime.now(timezone.utc),
        )
        async with get_session() as session:
            session.add(row)
            await session.commit()
        return raw_token

    @classmethod
    async def consume(cls, raw_token: str) -> dict:
        """Validates + marks the token used in one step. Returns None if invalid,
        already used, or expired."""
        token_hash = _hash(raw_token)
        async with get_session() as session:
            row = await session.scalar(
                select(PasswordResetRow).where(PasswordResetRow.token_hash == token_hash, PasswordResetRow.used.is_(False))
            )
            if not row:
                return None
            expires_at = row.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                return None
            record = row_to_dict(row)
            await session.execute(update(PasswordResetRow).where(PasswordResetRow.id == row.id).values(used=True))
            await session.commit()
            return record

    @classmethod
    async def cleanup_expired(cls) -> None:
        async with get_session() as session:
            await session.execute(delete(PasswordResetRow).where(PasswordResetRow.expires_at < datetime.now(timezone.utc)))
            await session.commit()

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
