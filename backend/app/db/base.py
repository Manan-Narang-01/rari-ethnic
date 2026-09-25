"""SQLAlchemy declarative base + generic row<->dict conversion.

Repositories never return ORM row objects to callers -- every method returns
a plain dict (or list of dicts), same as the Mongo repos did (`{"_id": 0}`
projection). `row_to_dict` is the one place that mapping happens, so no
repository has to hand-list its own columns.
"""
from datetime import datetime

from sqlalchemy import inspect
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def row_to_dict(row) -> dict | None:
    if row is None:
        return None
    return {c.key: getattr(row, c.key) for c in inspect(row).mapper.column_attrs}


def _parse_dt(value):
    return datetime.fromisoformat(value) if isinstance(value, str) else value


def coerce_datetimes(values: dict, fields: set) -> dict:
    """Services build their doc/update dicts the same way they always did --
    ISO-formatted strings for most timestamp fields (`doc["created_at"] =
    doc["created_at"].isoformat()`), because that's what Mongo needed. The
    Postgres columns are native TIMESTAMPTZ, so repositories parse those
    strings back to `datetime` before binding, same idea as the old
    `_coerce_created_at` helpers did on the read side."""
    return {k: (_parse_dt(v) if k in fields and v is not None else v) for k, v in values.items()}
