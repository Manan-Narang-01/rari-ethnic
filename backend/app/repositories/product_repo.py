from sqlalchemy import delete, or_, select, update

from app.database import get_session
from app.db.base import coerce_datetimes, row_to_dict
from app.db.models import ProductRow

_DATETIME_FIELDS = {"created_at"}


class ProductRepository:
    @classmethod
    async def list_public(cls, *, category: str = None, is_bestseller: bool = None,
                           is_navratri: bool = None, is_new: bool = None, q: str = None,
                           skip: int = 0, limit: int = 500) -> list:
        stmt = select(ProductRow).where(ProductRow.is_active.is_(True))
        if category:
            stmt = stmt.where(ProductRow.categories.contains([category]))  # array-contains, matches Mongo's multikey semantics
        if is_bestseller is not None:
            stmt = stmt.where(ProductRow.is_bestseller.is_(is_bestseller))
        if is_navratri is not None:
            stmt = stmt.where(ProductRow.is_navratri.is_(is_navratri))
        if is_new is not None:
            stmt = stmt.where(ProductRow.is_new.is_(is_new))
        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(or_(ProductRow.name.ilike(pattern), ProductRow.fabric.ilike(pattern), ProductRow.description.ilike(pattern)))
        stmt = stmt.order_by(ProductRow.created_at.desc()).offset(skip).limit(limit)
        async with get_session() as session:
            rows = (await session.scalars(stmt)).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def list_all(cls, *, category: str = None, is_active: bool = None, q: str = None,
                        skip: int = 0, limit: int = 1000) -> list:
        stmt = select(ProductRow)
        if category:
            stmt = stmt.where(ProductRow.categories.contains([category]))
        if is_active is not None:
            stmt = stmt.where(ProductRow.is_active.is_(is_active))
        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(or_(ProductRow.name.ilike(pattern), ProductRow.fabric.ilike(pattern),
                                   ProductRow.description.ilike(pattern), ProductRow.slug.ilike(pattern)))
        stmt = stmt.order_by(ProductRow.created_at.desc()).offset(skip).limit(limit)
        async with get_session() as session:
            rows = (await session.scalars(stmt)).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def get_by_slug(cls, slug: str) -> dict:
        async with get_session() as session:
            row = await session.scalar(select(ProductRow).where(ProductRow.slug == slug))
            return row_to_dict(row)

    @classmethod
    async def get_by_id(cls, product_id: str) -> dict:
        async with get_session() as session:
            row = await session.get(ProductRow, product_id)
            return row_to_dict(row)

    @classmethod
    async def get_by_ids(cls, ids: list) -> dict:
        """Batch lookup keyed by id -- used by order creation so pricing a
        cart with N distinct products is one query instead of N sequential
        get_by_id round-trips."""
        if not ids:
            return {}
        async with get_session() as session:
            rows = (await session.scalars(select(ProductRow).where(ProductRow.id.in_(ids)))).all()
            return {r.id: row_to_dict(r) for r in rows}

    @classmethod
    async def decrement_stock_atomic(cls, quantities: dict) -> list:
        """Decrements stock for every {product_id: qty} in one transaction --
        all succeed or none do. Each decrement is its own compare-and-swap
        (`WHERE stock >= qty`) so two concurrent orders racing for the last
        units can't drive stock negative; if any one of them loses that race,
        the whole transaction is rolled back (no partial decrements survive)
        and the ids that failed are returned so the caller can reject the
        order with a clear "no longer available in that quantity" message."""
        async with get_session() as session:
            failed = []
            for product_id, qty in quantities.items():
                result = await session.execute(
                    update(ProductRow)
                    .where(ProductRow.id == product_id, ProductRow.stock >= qty)
                    .values(stock=ProductRow.stock - qty)
                )
                if result.rowcount == 0:
                    failed.append(product_id)
            if failed:
                await session.rollback()
                return failed
            await session.commit()
            return []

    @classmethod
    async def restock(cls, quantities: dict) -> None:
        """Increments stock back for every {product_id: qty} -- used when an
        order that had already decremented stock (see decrement_stock_atomic)
        is cancelled, so those units become orderable again. Best-effort: a
        product deleted since the order was placed has nothing to restock and
        is silently skipped."""
        if not quantities:
            return
        async with get_session() as session:
            for product_id, qty in quantities.items():
                await session.execute(
                    update(ProductRow).where(ProductRow.id == product_id).values(stock=ProductRow.stock + qty)
                )
            await session.commit()

    @classmethod
    async def slug_exists(cls, slug: str, *, exclude_id: str = None) -> bool:
        stmt = select(ProductRow.id).where(ProductRow.slug == slug)
        if exclude_id:
            stmt = stmt.where(ProductRow.id != exclude_id)
        async with get_session() as session:
            return (await session.scalar(stmt)) is not None

    @classmethod
    async def insert(cls, doc: dict) -> None:
        row = ProductRow(**coerce_datetimes(doc, _DATETIME_FIELDS))
        async with get_session() as session:
            session.add(row)
            await session.commit()

    @classmethod
    async def update(cls, product_id: str, updates: dict) -> bool:
        async with get_session() as session:
            result = await session.execute(
                update(ProductRow).where(ProductRow.id == product_id).values(**coerce_datetimes(updates, _DATETIME_FIELDS))
            )
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def delete(cls, product_id: str) -> bool:
        async with get_session() as session:
            result = await session.execute(delete(ProductRow).where(ProductRow.id == product_id))
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def backfill_defaults(cls) -> None:
        """No-op on Postgres -- this only ever migrated documents from before
        these fields (or the `categories` list, replacing the old singular
        `category` string) existed in Mongo's schemaless documents. The
        Postgres schema is already in the target shape from day one."""
        pass

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
