import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, func, select, update

from app.database import get_session
from app.db.base import coerce_datetimes, row_to_dict
from app.db.models import CategoryRow

DEFAULT_CATEGORIES = [
    {"key": "kurtis", "name": "Kurtis", "sort_order": 1},
    {"key": "suits", "name": "Suits", "sort_order": 2},
    {"key": "lehengas", "name": "Lehengas", "sort_order": 3},
]

_DATETIME_FIELDS = {"created_at"}


class CategoryRepository:
    @classmethod
    async def list_public(cls) -> list:
        async with get_session() as session:
            rows = (await session.scalars(
                select(CategoryRow).where(CategoryRow.is_active.is_(True)).order_by(CategoryRow.sort_order.asc()).limit(200)
            )).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def list_all(cls) -> list:
        async with get_session() as session:
            rows = (await session.scalars(select(CategoryRow).order_by(CategoryRow.sort_order.asc()).limit(500))).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def get_by_key(cls, key: str) -> dict:
        async with get_session() as session:
            row = await session.scalar(select(CategoryRow).where(CategoryRow.key == key))
            return row_to_dict(row)

    @classmethod
    async def get_by_id(cls, category_id: str) -> dict:
        async with get_session() as session:
            row = await session.get(CategoryRow, category_id)
            return row_to_dict(row)

    @classmethod
    async def key_exists(cls, key: str, *, exclude_id: str = None) -> bool:
        stmt = select(CategoryRow.id).where(CategoryRow.key == key)
        if exclude_id:
            stmt = stmt.where(CategoryRow.id != exclude_id)
        async with get_session() as session:
            return (await session.scalar(stmt)) is not None

    @classmethod
    async def insert(cls, doc: dict) -> None:
        row = CategoryRow(**coerce_datetimes(doc, _DATETIME_FIELDS))
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def update(cls, category_id: str, updates: dict) -> bool:
        async with get_session() as session:
            result = await session.execute(
                update(CategoryRow).where(CategoryRow.id == category_id).values(**coerce_datetimes(updates, _DATETIME_FIELDS))
            )
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def delete(cls, category_id: str) -> bool:
        async with get_session() as session:
            result = await session.execute(delete(CategoryRow).where(CategoryRow.id == category_id))
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def ensure_defaults(cls) -> None:
        """Seeds the categories the existing product catalog already assumes
        (kurtis/suits/lehengas), so pre-existing products never end up
        referencing a category that doesn't exist. No-op once anything exists."""
        async with get_session() as session:
            count = await session.scalar(select(func.count()).select_from(CategoryRow))
            if count:
                return
            now = datetime.now(timezone.utc)
            rows = [
                CategoryRow(
                    id=str(uuid.uuid4()), key=c["key"], name=c["name"], description="",
                    image=None, sort_order=c["sort_order"], is_active=True,
                    show_in_navbar=True, show_in_catalog=True, created_at=now,
                )
                for c in DEFAULT_CATEGORIES
            ]
            session.add_all(rows)
            await session.commit()

    @classmethod
    async def backfill_defaults(cls) -> None:
        """No-op on Postgres -- see ProductRepository.backfill_defaults."""
        pass

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
