from datetime import datetime, timezone

from sqlalchemy import select, update

from app.database import get_session
from app.db.base import coerce_datetimes, row_to_dict
from app.db.models import OrderRow

_DATETIME_FIELDS = {"created_at", "delivered_at"}


class OrderRepository:
    @classmethod
    async def insert(cls, doc: dict) -> None:
        row = OrderRow(**coerce_datetimes(doc, _DATETIME_FIELDS))
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def get_by_order_number(cls, order_number: str) -> dict:
        async with get_session() as session:
            row = await session.scalar(select(OrderRow).where(OrderRow.order_number == order_number))
            return row_to_dict(row)

    @classmethod
    async def get_by_id(cls, order_id: str) -> dict:
        async with get_session() as session:
            row = await session.get(OrderRow, order_id)
            return row_to_dict(row)

    @classmethod
    async def list_all(cls) -> list:
        async with get_session() as session:
            rows = (await session.scalars(select(OrderRow).order_by(OrderRow.created_at.desc()).limit(1000))).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def list_for_user(cls, user_id: str) -> list:
        async with get_session() as session:
            rows = (await session.scalars(
                select(OrderRow).where(OrderRow.user_id == user_id).order_by(OrderRow.created_at.desc()).limit(500)
            )).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def update_by_order_number(cls, order_number: str, updates: dict) -> bool:
        async with get_session() as session:
            result = await session.execute(
                update(OrderRow).where(OrderRow.order_number == order_number)
                .values(**coerce_datetimes(updates, _DATETIME_FIELDS))
            )
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def update_status(cls, order_number: str, status: str) -> bool:
        async with get_session() as session:
            values = {"status": status}
            if status == "delivered":
                existing = await session.scalar(select(OrderRow.delivered_at).where(OrderRow.order_number == order_number))
                if existing is None:
                    values["delivered_at"] = datetime.now(timezone.utc)
            result = await session.execute(update(OrderRow).where(OrderRow.order_number == order_number).values(**values))
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
