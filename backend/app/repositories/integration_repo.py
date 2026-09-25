import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, func, select, update

from app.database import get_session
from app.db.base import coerce_datetimes, row_to_dict
from app.db.models import IntegrationRow

_DATETIME_FIELDS = {"updated_at"}


class IntegrationRepository:
    @classmethod
    async def list_all(cls) -> list:
        async with get_session() as session:
            rows = (await session.scalars(
                select(IntegrationRow).order_by(IntegrationRow.category.asc(), IntegrationRow.label.asc()).limit(500)
            )).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def get_by_id(cls, integration_id: str) -> dict:
        async with get_session() as session:
            row = await session.get(IntegrationRow, integration_id)
            return row_to_dict(row)

    @classmethod
    async def get_by_provider(cls, category: str, provider: str) -> dict:
        async with get_session() as session:
            row = await session.scalar(
                select(IntegrationRow).where(IntegrationRow.category == category, IntegrationRow.provider == provider)
            )
            return row_to_dict(row)

    @classmethod
    async def provider_exists(cls, category: str, provider: str, *, exclude_id: str = None) -> bool:
        stmt = select(IntegrationRow.id).where(IntegrationRow.category == category, IntegrationRow.provider == provider)
        if exclude_id:
            stmt = stmt.where(IntegrationRow.id != exclude_id)
        async with get_session() as session:
            return (await session.scalar(stmt)) is not None

    @classmethod
    async def insert(cls, doc: dict) -> None:
        row = IntegrationRow(**coerce_datetimes(doc, _DATETIME_FIELDS))
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def update(cls, integration_id: str, updates: dict) -> bool:
        async with get_session() as session:
            result = await session.execute(
                update(IntegrationRow).where(IntegrationRow.id == integration_id)
                .values(**coerce_datetimes(updates, _DATETIME_FIELDS))
            )
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def delete(cls, integration_id: str) -> bool:
        async with get_session() as session:
            result = await session.execute(delete(IntegrationRow).where(IntegrationRow.id == integration_id))
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def ensure_defaults(cls, catalog: dict) -> None:
        """Seeds the starter provider catalog. Only runs against a completely
        empty table -- once any rows exist (including after a Super Admin
        deletes one of the starter providers), this is a no-op, so deletes
        are permanent rather than being re-seeded on next boot."""
        async with get_session() as session:
            count = await session.scalar(select(func.count()).select_from(IntegrationRow))
            if count:
                return
            now = datetime.now(timezone.utc)
            rows = [
                IntegrationRow(
                    id=str(uuid.uuid4()), category=category, provider=provider, label=meta["label"],
                    fields=meta["fields"], is_enabled=False, credentials={}, updated_at=now,
                )
                for category, providers in catalog.items()
                for provider, meta in providers.items()
            ]
            session.add_all(rows)
            await session.commit()

    @classmethod
    async def ensure_provider_exists(cls, category: str, provider: str, meta: dict) -> None:
        """Introduces a single new catalog provider added in a later version
        of the app (e.g. SMTP) into an install that already has other
        providers -- unlike ensure_defaults, this doesn't require the whole
        table to be empty. Note: unlike ensure_defaults' starter set, this
        one re-creates the provider on every restart if it's ever deleted,
        since there's no way to tell "never existed" apart from "deleted"
        without a tombstone -- acceptable since this is meant for a small
        number of built-in singleton providers, not arbitrary ones."""
        if await cls.get_by_provider(category, provider):
            return
        row = IntegrationRow(
            id=str(uuid.uuid4()), category=category, provider=provider, label=meta["label"],
            fields=meta["fields"], is_enabled=False, credentials={}, updated_at=datetime.now(timezone.utc),
        )
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def backfill_defaults(cls, catalog: dict) -> None:
        """No-op on Postgres -- this only ever migrated documents from before
        `label`/`fields` were stored on the document itself. The Postgres
        schema requires them from day one."""
        pass

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
