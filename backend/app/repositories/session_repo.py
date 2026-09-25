from datetime import datetime, timezone

from sqlalchemy import delete, update

from app.database import get_session
from app.db.base import row_to_dict
from app.db.models import RefreshSessionRow


class SessionRepository:
    """Tracks issued refresh tokens so they can be revoked (logout, password reset,
    role change) without waiting for natural JWT expiry."""

    @classmethod
    async def create(cls, *, jti: str, user_id: str, expires_at: datetime) -> None:
        row = RefreshSessionRow(
            jti=jti, user_id=user_id, expires_at=expires_at, revoked=False,
            created_at=datetime.now(timezone.utc),
        )
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def get(cls, jti: str) -> dict:
        async with get_session() as session:
            row = await session.get(RefreshSessionRow, jti)
            return row_to_dict(row)

    @classmethod
    async def revoke(cls, jti: str) -> None:
        async with get_session() as session:
            await session.execute(update(RefreshSessionRow).where(RefreshSessionRow.jti == jti).values(revoked=True))
            await session.commit()

    @classmethod
    async def revoke_all_for_user(cls, user_id: str) -> None:
        async with get_session() as session:
            await session.execute(
                update(RefreshSessionRow).where(RefreshSessionRow.user_id == user_id).values(revoked=True)
            )
            await session.commit()

    @classmethod
    async def cleanup_expired(cls) -> None:
        """Best-effort housekeeping standing in for Mongo's TTL index -- the
        real security boundary is the refresh JWT's own `exp` claim, checked
        (via decode_token) before this table is ever read in
        AuthService.refresh_tokens, so this is just cleanup, not a security
        control."""
        async with get_session() as session:
            await session.execute(delete(RefreshSessionRow).where(RefreshSessionRow.expires_at < datetime.now(timezone.utc)))
            await session.commit()

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
