"""Seed a few demo products for local testing.

Run once after starting MongoDB:  python seed_demo.py
Safe to re-run — it skips products whose slug already exists.
"""
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent / ".env")

client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
db = client[os.environ.get("DB_NAME", "rari_local")]

IMG = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200"
IMG2 = "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=1200"

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
}

inserted = 0
for p in DEMO:
    if db.products.find_one({"slug": p["slug"]}):
        print(f"skip (exists): {p['slug']}")
        continue
    doc = {
        "id": str(uuid.uuid4()),
        **BASE,
        **p,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    doc.setdefault("compare_at_price", None)
    doc.setdefault("navratri_day", None)
    doc.setdefault("edit_tag", None)
    db.products.insert_one(doc)
    inserted += 1
    print(f"added: {p['name']}")

print(f"\nDone. Inserted {inserted} demo product(s) into '{db.name}'.")
