"""Seed a few demo products for local testing.

Run once after `alembic upgrade head`:  python seed_demo.py
Safe to re-run -- it skips products whose slug already exists.
"""
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app import database
from app.db.models import ProductRow

IMG = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200"
# The original second demo image (photo-1583391733956-6c78276477e2) is now a
# dead Unsplash URL (404) -- it made every product's hover/secondary image
# blank on the storefront. Replaced with a live one.
IMG2 = "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200"

DEMO = [
    {
        "slug": "marigold-anarkali-suit", "name": "Marigold Anarkali Suit", "categories": ["suits"],
        "price": 2499, "compare_at_price": 3299, "stock": 6,
        "is_bestseller": True, "is_new": True, "is_navratri": True, "edit_tag": "Family Function",
        "navratri_day": "Day 5 - Yellow",
    },
    {
        "slug": "ivory-chikankari-kurti", "name": "Ivory Chikankari Kurti", "categories": ["kurtis"],
        "price": 1299, "compare_at_price": 1799, "stock": 12,
        "is_bestseller": True, "is_new": False, "is_navratri": False,
    },
    {
        "slug": "maroon-garba-lehenga", "name": "Maroon Mirror Garba Lehenga", "categories": ["lehengas"],
        "price": 4999, "compare_at_price": 6499, "stock": 3,
        "is_bestseller": True, "is_new": True, "is_navratri": True, "edit_tag": "Garba Ready",
        "navratri_day": "Day 3 - Red",
    },
    {
        "slug": "teal-palazzo-suit", "name": "Teal Palazzo Suit Set", "categories": ["suits"],
        "price": 1899, "compare_at_price": None, "stock": 9,
        "is_bestseller": False, "is_new": True, "is_navratri": False,
    },
    {
        "slug": "peacock-navratri-lehenga", "name": "Peacock Green Navratri Lehenga", "categories": ["lehengas"],
        "price": 5499, "compare_at_price": 6999, "stock": 4,
        "is_bestseller": False, "is_new": True, "is_navratri": True, "edit_tag": "Garba Ready",
        "navratri_day": "Day 9 - Peacock Green",
    },
    {
        "slug": "cotton-daily-kurti", "name": "Everyday Cotton Kurti", "categories": ["kurtis"],
        "price": 899, "compare_at_price": 1199, "stock": 20,
        "is_bestseller": True, "is_new": False, "is_navratri": False,
    },
]

BASE = {
    "description": "Handcrafted in Surat with breathable, festive-ready fabric. Cut for comfort and made to twirl.",
    "fabric": "Premium rayon blend with fine embroidery.",
    "care": "Dry clean recommended. Iron on medium.",
    "fit_notes": "True to size. Model wears M.",
    "occasion": ["Festive", "Navratri", "Family function"],
    "sizes": ["S", "M", "L", "XL"],
    "colors": ["As shown"],
    "color_hex": ["#A0684E"],
    "images": [IMG, IMG2],
    "is_active": True,
    "shipping_enabled": False,
    "shipping_charge": 0,
}


async def main() -> None:
    database.connect()
    inserted = 0
    async with database.get_session() as session:
        for p in DEMO:
            existing = await session.scalar(select(ProductRow.id).where(ProductRow.slug == p["slug"]))
            if existing:
                print(f"skip (exists): {p['slug']}")
                continue
            doc = {
                "id": str(uuid.uuid4()),
                **BASE,
                **p,
                "created_at": datetime.now(timezone.utc),
            }
            doc.setdefault("compare_at_price", None)
            doc.setdefault("navratri_day", None)
            doc.setdefault("edit_tag", None)
            session.add(ProductRow(**doc))
            inserted += 1
            print(f"added: {p['name']}")
        await session.commit()

    print(f"\nDone. Inserted {inserted} demo product(s).")
    await database.close()


if __name__ == "__main__":
    asyncio.run(main())
