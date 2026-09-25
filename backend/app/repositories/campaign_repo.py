from sqlalchemy import delete, select, update

from app.database import get_session
from app.db.base import coerce_datetimes, row_to_dict
from app.db.models import CampaignAuditLogRow, CampaignRow

_DATETIME_FIELDS = {"created_at", "countdown_target"}


class CampaignRepository:
    @classmethod
    async def list_all(cls) -> list:
        async with get_session() as session:
            rows = (await session.scalars(select(CampaignRow).order_by(CampaignRow.created_at.desc()).limit(500))).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def get_by_id(cls, campaign_id: str) -> dict:
        async with get_session() as session:
            row = await session.get(CampaignRow, campaign_id)
            return row_to_dict(row)

    @classmethod
    async def get_active(cls) -> dict:
        async with get_session() as session:
            row = await session.scalar(select(CampaignRow).where(CampaignRow.is_active.is_(True)))
            return row_to_dict(row)

    @classmethod
    async def insert(cls, doc: dict, *, deactivate_others: bool = False) -> None:
        # When the new campaign is created active, the deactivate-others step
        # runs in the SAME transaction/commit as the insert (not a separate
        # deactivate_all() call) so two concurrent activations can't interleave
        # and leave more than one campaign active -- the deactivate statement's
        # row locks (held until this commit) serialize against any other
        # in-flight activation touching the same rows.
        row = CampaignRow(**coerce_datetimes(doc, _DATETIME_FIELDS))
        async with get_session() as session:
            if deactivate_others:
                await session.execute(update(CampaignRow).values(is_active=False))
            session.add(row)
            await session.commit()

    @classmethod
    async def update(cls, campaign_id: str, updates: dict, *, deactivate_others: bool = False) -> bool:
        async with get_session() as session:
            if deactivate_others:
                await session.execute(update(CampaignRow).where(CampaignRow.id != campaign_id).values(is_active=False))
            result = await session.execute(
                update(CampaignRow).where(CampaignRow.id == campaign_id).values(**coerce_datetimes(updates, _DATETIME_FIELDS))
            )
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def delete(cls, campaign_id: str) -> bool:
        async with get_session() as session:
            result = await session.execute(delete(CampaignRow).where(CampaignRow.id == campaign_id))
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def backfill_defaults(cls) -> None:
        """No-op on Postgres -- this only ever migrated the old rigid
        `day_colors` field into `attribute_groups` for documents from before
        that field existed. `day_colors` isn't even a column in the Postgres
        schema; a Mongo->Postgres data migration handles that shape directly
        (see migrate_mongo_to_postgres.py) instead of via this backfill."""
        pass

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass


class CampaignAuditLogRepository:
    _DATETIME_FIELDS = {"created_at"}

    @classmethod
    async def insert(cls, doc: dict) -> None:
        row = CampaignAuditLogRow(**coerce_datetimes(doc, cls._DATETIME_FIELDS))
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def list_for_campaign(cls, campaign_id: str) -> list:
        async with get_session() as session:
            rows = (await session.scalars(
                select(CampaignAuditLogRow).where(CampaignAuditLogRow.campaign_id == campaign_id)
                .order_by(CampaignAuditLogRow.created_at.desc()).limit(500)
            )).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def list_all(cls) -> list:
        async with get_session() as session:
            rows = (await session.scalars(
                select(CampaignAuditLogRow).order_by(CampaignAuditLogRow.created_at.desc()).limit(1000)
            )).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
