from datetime import datetime, timezone

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database import get_session
from app.db.base import row_to_dict
from app.db.models import CartRow


class CartRepository:
    @classmethod
    async def get_by_user(cls, user_id: str) -> dict:
        async with get_session() as session:
            row = await session.get(CartRow, user_id)
            return row_to_dict(row)

    @classmethod
    async def upsert(cls, user_id: str, items: list) -> dict:
        now = datetime.now(timezone.utc)
        stmt = pg_insert(CartRow).values(user_id=user_id, items=items, updated_at=now)
        stmt = stmt.on_conflict_do_update(
            index_elements=[CartRow.user_id], set_={"items": items, "updated_at": now}
        )
        async with get_session() as session:
            await session.execute(stmt)
            await session.commit()
        return {"user_id": user_id, "items": items, "updated_at": now}

    @classmethod
    async def clear(cls, user_id: str) -> None:
        async with get_session() as session:
            await session.execute(delete(CartRow).where(CartRow.user_id == user_id))
            await session.commit()

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
