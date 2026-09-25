import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update

from app.database import get_session
from app.db.base import row_to_dict
from app.db.models import OtpRow

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

    @classmethod
    async def create(cls, email: str, registration: dict) -> str:
        # Normalized the same way as UserRepository -- callers may pass either
        # the raw form input or an already-lowercased email, and both must
        # resolve to the same record.
        email = email.strip().lower()
        code = f"{secrets.randbelow(1000000):06d}"
        row = OtpRow(
            id=str(uuid.uuid4()), email=email, code_hash=_hash(code), registration=registration,
            attempts=0, expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
            used=False, created_at=datetime.now(timezone.utc),
        )
        async with get_session() as session:
            await session.execute(delete(OtpRow).where(OtpRow.email == email))  # invalidate any earlier attempt
            session.add(row)
            await session.commit()
        return code

    @classmethod
    async def get_pending(cls, email: str) -> dict:
        """The not-yet-verified registration record for `email`, for resending
        the code -- or None if there's no pending signup for it."""
        email = email.strip().lower()
        async with get_session() as session:
            row = await session.scalar(select(OtpRow).where(OtpRow.email == email, OtpRow.used.is_(False)))
            return row_to_dict(row)

    @classmethod
    async def verify(cls, email: str, code: str) -> dict:
        """Returns the stored registration payload on success, or None on any
        failure (wrong code, expired, too many attempts, nothing pending)."""
        email = email.strip().lower()
        async with get_session() as session:
            row = await session.scalar(select(OtpRow).where(OtpRow.email == email, OtpRow.used.is_(False)))
            if not row:
                return None
            expires_at = row.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc) or row.attempts >= MAX_ATTEMPTS:
                return None
            if row.code_hash != _hash(code):
                await session.execute(update(OtpRow).where(OtpRow.id == row.id).values(attempts=OtpRow.attempts + 1))
                await session.commit()
                return None
            registration = row.registration
            await session.execute(update(OtpRow).where(OtpRow.id == row.id).values(used=True))
            await session.commit()
            return registration

    @classmethod
    async def cleanup_expired(cls) -> None:
        async with get_session() as session:
            await session.execute(delete(OtpRow).where(OtpRow.expires_at < datetime.now(timezone.utc)))
            await session.commit()

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
