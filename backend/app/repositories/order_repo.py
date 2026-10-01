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
    async def update_status(cls, order_number: str, status: str, *, expected_status: str = None, extra: dict = None) -> bool:
        """When `expected_status` is given, this is an atomic compare-and-swap
        (`WHERE status = expected_status`) rather than an unconditional write.
        A caller that restocks products after a successful cancellation (see
        OrderService.restock_cancelled_order) needs this: without it, an
        admin manually cancelling an order at the same moment the automatic
        pending_payment expiry sweep (OrderService.expire_stale_pending_payments)
        cancels that same order could both see the transition as "theirs" and
        both restock it, double-crediting inventory that was only ever
        reserved once. `extra` sets additional columns (e.g. razorpay_refund_id)
        in the same statement -- used so a caller that also triggers a real
        side effect (issuing a refund) on a successful transition can't have
        two concurrent calls both see themselves as the winner and both fire
        that side effect (see verify_razorpay_payment)."""
        async with get_session() as session:
            values = {"status": status, **(extra or {})}
            if status == "delivered":
                existing = await session.scalar(select(OrderRow.delivered_at).where(OrderRow.order_number == order_number))
                if existing is None:
                    values["delivered_at"] = datetime.now(timezone.utc)
            stmt = update(OrderRow).where(OrderRow.order_number == order_number)
            if expected_status is not None:
                stmt = stmt.where(OrderRow.status == expected_status)
            result = await session.execute(stmt.values(**values))
            await session.commit()
            return result.rowcount > 0

    @classmethod
    async def list_stale_pending_payment(cls, older_than: datetime) -> list:
        """Razorpay orders still awaiting payment confirmation from before
        `older_than` -- candidates for OrderService.expire_stale_pending_payments
        to auto-cancel and restock."""
        async with get_session() as session:
            rows = (await session.scalars(
                select(OrderRow).where(OrderRow.status == "pending_payment", OrderRow.created_at < older_than)
            )).all()
            return [row_to_dict(r) for r in rows]

    @classmethod
    async def ensure_indexes(cls) -> None:
        pass
