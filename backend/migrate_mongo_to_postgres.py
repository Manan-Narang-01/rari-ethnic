"""One-time, best-effort data migration: copies every collection from the old
MongoDB database into the new Postgres schema.

Not run automatically as part of the MongoDB->PostgreSQL backend migration --
the Postgres schema starts empty (seeded fresh via seed_demo.py) by default.
Run this only if there's real data in the old Mongo cluster worth keeping.

Usage:
    pip install pymongo   # not a project dependency anymore, needed for this script only
    python migrate_mongo_to_postgres.py

Reads MONGO_URL/DB_NAME from the environment (same variables the app used
before this migration -- no longer read by app/config.py, so export them
manually or pass on the command line) and DATABASE_URL from backend/.env via
app.config.settings, same as the running app.

Safe to re-run: every table is truncated before it's repopulated, so this is
"replace", not "append".
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

from pymongo import MongoClient
from sqlalchemy import delete

from app import database
from app.db.models import (
    CampaignRow, CartRow, CategoryRow, ContactMessageRow, ExchangeRequestRow,
    IntegrationRow, OrderRow, OtpRow, PasswordResetRow, ProductRow,
    RefreshSessionRow, SiteSettingsRow, SubscriberRow, UserRow,
)

MONGO_URL = os.environ.get("MONGO_URL")
MONGO_DB_NAME = os.environ.get("DB_NAME")


def _dt(value):
    """Mongo stored timestamps as either ISO strings or real BSON dates
    depending on the collection (see docs/BACKEND_ARCHITECTURE.md) -- normalize
    both to timezone-aware datetimes for the TIMESTAMPTZ columns."""
    if value is None:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def _strip(doc: dict, *keys) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    for k in keys:
        doc.pop(k, None)
    return doc


def _migrate_campaign(doc: dict) -> dict:
    """Folds the legacy `day_colors` shape into `attribute_groups`, same
    transform CampaignRepository.backfill_defaults used to apply post-hoc in
    Mongo -- done here instead, once, at copy time."""
    doc = _strip(doc, "day_colors")
    day_colors = doc.pop("day_colors", None) if "day_colors" in doc else None
    groups = doc.get("attribute_groups") or []
    if day_colors:
        items = [
            {"order": d.get("day", 0), "title": d.get("name", ""), "subtitle": "",
             "description": d.get("meaning", ""), "color": d.get("hex"), "icon": None}
            for d in day_colors
        ]
        groups = groups + [{"key": "day-colours", "title": "Day Colours", "items": items}]
    doc["attribute_groups"] = groups
    return doc


def _migrate_settings(doc: dict) -> dict:
    tiles = doc.get("instagram_tiles") or []
    doc["instagram_tiles"] = [{"image": t, "post_url": None} if isinstance(t, str) else t for t in tiles]
    return doc


def _migrate_product(doc: dict) -> dict:
    """Folds the legacy singular `category` field into `categories`, same
    transform ProductRepository.backfill_defaults used to apply post-hoc."""
    doc = _strip(doc, "category")
    if "categories" not in doc:
        legacy = doc.get("category")
        doc["categories"] = [legacy] if legacy else []
    doc.setdefault("is_active", True)
    doc.setdefault("shipping_enabled", False)
    doc.setdefault("shipping_charge", 0)
    return doc


async def main() -> None:
    if not MONGO_URL or not MONGO_DB_NAME:
        print("Set MONGO_URL and DB_NAME in the environment before running this script.")
        sys.exit(1)

    mongo = MongoClient(MONGO_URL)[MONGO_DB_NAME]
    database.connect()

    async with database.get_session() as session:
        # Order matters: parents before children, so foreign keys resolve.
        await session.execute(delete(RefreshSessionRow))
        await session.execute(delete(PasswordResetRow))
        await session.execute(delete(ExchangeRequestRow))
        await session.execute(delete(CartRow))
        await session.execute(delete(OrderRow))
        await session.execute(delete(OtpRow))
        await session.execute(delete(UserRow))
        await session.execute(delete(ProductRow))
        await session.execute(delete(CategoryRow))
        await session.execute(delete(CampaignRow))
        await session.execute(delete(IntegrationRow))
        await session.execute(delete(SiteSettingsRow))
        await session.execute(delete(SubscriberRow))
        await session.execute(delete(ContactMessageRow))
        await session.commit()

        for mdoc in mongo.users.find():
            d = _strip(mdoc)
            session.add(UserRow(**{**d, "created_at": _dt(d.get("created_at")), "updated_at": _dt(d.get("updated_at"))}))
        for mdoc in mongo.categories.find():
            d = _strip(mdoc)
            session.add(CategoryRow(**{**d, "created_at": _dt(d.get("created_at"))}))
        for mdoc in mongo.products.find():
            d = _migrate_product(_strip(mdoc))
            session.add(ProductRow(**{**d, "created_at": _dt(d.get("created_at"))}))
        for mdoc in mongo.orders.find():
            d = _strip(mdoc)
            session.add(OrderRow(**{**d, "created_at": _dt(d.get("created_at")), "delivered_at": _dt(d.get("delivered_at"))}))
        for mdoc in mongo.carts.find():
            d = _strip(mdoc, "_id")
            session.add(CartRow(**{**d, "updated_at": _dt(d.get("updated_at"))}))
        for mdoc in mongo.campaigns.find():
            d = _migrate_campaign(_strip(mdoc))
            session.add(CampaignRow(**{**d, "created_at": _dt(d.get("created_at")), "countdown_target": _dt(d.get("countdown_target"))}))
        for mdoc in mongo.exchange_requests.find():
            d = _strip(mdoc)
            session.add(ExchangeRequestRow(**{**d, "created_at": _dt(d.get("created_at")), "updated_at": _dt(d.get("updated_at"))}))
        for mdoc in mongo.integrations.find():
            d = _strip(mdoc)
            session.add(IntegrationRow(**{**d, "updated_at": _dt(d.get("updated_at"))}))
        for mdoc in mongo.settings.find():
            d = _migrate_settings(_strip(mdoc))
            session.add(SiteSettingsRow(**{**d, "updated_at": _dt(d.get("updated_at"))}))
        for mdoc in mongo.subscribers.find():
            d = _strip(mdoc)
            session.add(SubscriberRow(**{**d, "created_at": _dt(d.get("created_at"))}))
        for mdoc in mongo.contact_messages.find():
            d = _strip(mdoc)
            session.add(ContactMessageRow(**{**d, "created_at": _dt(d.get("created_at"))}))
        # refresh_sessions/password_resets/otps are short-lived and worthless
        # to carry over -- every session/token from the old deployment is
        # either already expired or about to be, so users simply log in again.

        await session.commit()

    await database.close()
    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(main())
