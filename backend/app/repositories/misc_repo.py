from sqlalchemy import select

from app.database import get_session
from app.db.base import coerce_datetimes, row_to_dict
from app.db.models import ContactMessageRow, SubscriberRow

_DATETIME_FIELDS = {"created_at"}


class SubscriberRepository:
    @classmethod
    async def insert(cls, doc: dict) -> None:
        row = SubscriberRow(**coerce_datetimes(doc, _DATETIME_FIELDS))
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def list_all(cls) -> list:
        async with get_session() as session:
            rows = (await session.scalars(select(SubscriberRow).order_by(SubscriberRow.created_at.desc()).limit(2000))).all()
            return [row_to_dict(r) for r in rows]


class ContactMessageRepository:
    @classmethod
    async def insert(cls, doc: dict) -> None:
        row = ContactMessageRow(**coerce_datetimes(doc, _DATETIME_FIELDS))
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def list_all(cls) -> list:
        async with get_session() as session:
            rows = (await session.scalars(
                select(ContactMessageRow).order_by(ContactMessageRow.created_at.desc()).limit(2000)
            )).all()
            return [row_to_dict(r) for r in rows]
