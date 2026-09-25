from sqlalchemy import select, update

from app.database import get_session
from app.db.base import coerce_datetimes, row_to_dict
from app.db.models import ExchangeRequestRow

_DATETIME_FIELDS = {"created_at", "updated_at"}


class ExchangeRequestRepository:
    @classmethod
    async def insert(cls, doc: dict) -> None:
        row = ExchangeRequestRow(**coerce_datetimes(doc, _DATETIME_FIELDS))
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def get_by_id(cls, request_id: str) -> dict:
        async with get_session() as session:
            row = await session.get(ExchangeRequestRow, request_id)
            return row_to_dict(row)

    @classmethod
    async def get_active_for_order(cls, order_id: str) -> dict:
        """An existing request that isn't rejected -- used to block duplicate
        requests for the same order while one is pending/approved/completed."""
        async with get_session() as session:
            row = await session.scalar(
                select(ExchangeRequestRow).where(
                    ExchangeRequestRow.order_id == order_id, ExchangeRequestRow.status != "rejected"
                )
            )
            return row_to_dict(row)

    @classmethod
    async def list_for_user(cls, user_id: str) -> list:
        async with get_session() as session:
            rows = (await session.scalars(
                select(ExchangeRequestRow).where(ExchangeRequestRow.user_id == user_id)
                .order_by(ExchangeRequestRow.created_at.desc()).limit(500)
            )).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def list_all(cls) -> list:
        async with get_session() as session:
            rows = (await session.scalars(
                select(ExchangeRequestRow).order_by(ExchangeRequestRow.created_at.desc()).limit(1000)
            )).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def update(cls, request_id: str, updates: dict) -> bool:
        async with get_session() as session:
            result = await session.execute(
                update(ExchangeRequestRow).where(ExchangeRequestRow.id == request_id)
                .values(**coerce_datetimes(updates, _DATETIME_FIELDS))
            )
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
