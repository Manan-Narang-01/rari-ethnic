"""Comprehensive, realistic seed dataset covering every entity/feature the app
actually has: all 3 user roles, every product/order/exchange-request status,
category visibility states, an active + draft campaign, populated site
settings, two configured payment/shipping integrations, subscribers and
contact messages.

Deliberately does NOT seed reviews/wishlists/coupons/payments/refunds/
notifications/audit-logs/addresses -- none of those exist in this codebase
(see docs/BACKEND_ARCHITECTURE.md §13, "planned", not built). Also does not
seed refresh_sessions/password_resets -- those are ephemeral session
artifacts, not meaningful demo data.

Idempotent: truncates every table it owns (FK-safe order) before reseeding,
and updates (not duplicates) the `settings` singleton and the fixed
`integrations` catalog. Safe to run repeatedly.

Run:      python seed_full.py
Requires: `alembic upgrade head` already applied.
"""
import asyncio
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select

from app import database
from app.config import settings as app_settings
from app.core.security import hash_password
from app.db.models import (
    CampaignAuditLogRow, CampaignRow, CartRow, CategoryRow, ContactMessageRow, ExchangeRequestRow,
    IntegrationRow, OrderRow, OtpRow, PasswordResetRow, ProductRow,
    RefreshSessionRow, SiteSettingsRow, SubscriberRow, UserRow,
)
from app.models.site_settings import SiteSettings
from app.utils.crypto import encrypt
from app.utils.slugify import slugify

NOW = datetime.now(timezone.utc)


def ago(days=0, hours=0):
    return NOW - timedelta(days=days, hours=hours)


# ---------------------------------------------------------------------------
# Verified image pools (every URL live-checked with curl before use -- the
# previous seed script's dead Unsplash link was exactly this kind of bug).
# ---------------------------------------------------------------------------
def _u(photo_id, w=1200):
    return f"https://images.unsplash.com/{photo_id}?w={w}"


KURTI_IMG = [_u(p) for p in [
    "photo-1708534419572-6e6614a53ca1", "photo-1597983073750-16f5ded1321f",
    "photo-1760287363878-1a09af715b80", "photo-1760287364219-160c234ded00",
    "photo-1708534246055-d7b149acb731", "photo-1760287363750-1c888c75578f",
    "photo-1715859019107-90c16285b149", "photo-1708534246051-7f47b279e94b",
    "photo-1765529374927-052599af9c82", "photo-1759840278381-bf7d5e332050",
    "photo-1572491548306-f8c78240284f", "photo-1759840278478-826c0d0f110e",
    "photo-1759840278511-f73a3d62fb9f", "photo-1759840278471-462cf3fcebd3",
]]
SUIT_IMG = [_u(p) for p in [
    "photo-1583391733981-8b530b760347", "photo-1786596552158-fb0aa2d260ba",
    "photo-1776436817748-f8e10a7e75b0", "photo-1786596552096-c782a23e00b3",
    "photo-1759851684030-818f50799ce5", "photo-1780504863283-3157e6d141e1",
    "photo-1759851684329-f34e3f3fb8b1", "photo-1544936951-fe1a0a21ac90",
    "photo-1712852733629-c5b8194290e8", "photo-1698657169271-5b569ff3234e",
    "photo-1669194721812-add84c9d2479", "photo-1599386649791-4ba2de67dd0e",
    "photo-1644267128350-5ca6a74fd542", "photo-1705921290360-92163168f4ab",
]]
LEHENGA_IMG = [_u(p) for p in [
    "photo-1654764746225-e63f5e90facd", "photo-1503160865267-af4660ce7bf2",
    "photo-1629118477133-b8b1499f2b8a", "photo-1610047614256-023d7c028d0b",
    "photo-1610047520958-b42ebcd2f6cb", "photo-1677691257363-eebd2abeafec",
    "photo-1570212773364-e30cd076539e", "photo-1707576618343-26a1b377ca7a",
    "photo-1735052711950-c31c729c2a4e", "photo-1668371459824-094a960a227d",
    "photo-1721324807083-e9ddaa99310e", "photo-1740674570259-a47d713a2976",
    "photo-1677691256999-45d69a11b197", "photo-1733937140732-2cc70a1d7017",
]]
DUPATTA_IMG = [_u(p) for p in [
    "photo-1622207691293-5cd80466dab3", "photo-1599584082894-52c6d8fc48c6",
    "photo-1717585679395-bbe39b5fb6bc", "photo-1706685481823-b8f1a1c11fca",
    "photo-1680506660555-1c225f5da953", "photo-1693382288218-2ce85aa26974",
    "photo-1680506742421-7420d343bf68", "photo-1762780700690-3fbb53fcd4e5",
    "photo-1761486927430-ebd8459a3888", "photo-1739005191373-c47e73a38f6a",
    "photo-1680506718587-dd49a97c8f32", "photo-1724655866616-966e549b3b84",
]]
BRIDAL_IMG = [_u(p) for p in [
    "photo-1630526720753-aa4e71acf67d", "photo-1665960213508-48f07086d49c",
    "photo-1583878545126-2f1ca0142714", "photo-1665960213530-3fb10da1f25e",
    "photo-1610173826014-d131b02d69ca", "photo-1610173826608-bd1f53a52db1",
    "photo-1733759414886-6b3a5423ceb3", "photo-1569810020669-aa9d38003ea7",
]]
HERO_IMG = [_u(p, 1600) for p in [
    "photo-1636986056375-184676d8ca14", "photo-1619239635803-d02b1ae98e38",
    "photo-1640292343595-889db1c8262e",
]]
AVATAR_IMG = [_u(p, 200) for p in [
    "photo-1536766768598-e09213fdcf22", "photo-1516239482977-b550ba7253f2",
]]


def imgs(pool, i, n=2):
    return [pool[(i * n + k) % len(pool)] for k in range(n)]


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
CATEGORIES = [
    {"key": "kurtis", "name": "Kurtis", "description": "Everyday to festive, cut for comfort",
     "image": KURTI_IMG[0], "sort_order": 1, "is_active": True, "show_in_navbar": True, "show_in_catalog": True},
    {"key": "suits", "name": "Suits", "description": "Palazzo, sharara & straight cuts",
     "image": SUIT_IMG[0], "sort_order": 2, "is_active": True, "show_in_navbar": True, "show_in_catalog": True},
    {"key": "lehengas", "name": "Lehengas", "description": "For the big days",
     "image": LEHENGA_IMG[0], "sort_order": 3, "is_active": True, "show_in_navbar": True, "show_in_catalog": True},
    {"key": "dupattas", "name": "Dupattas", "description": "Handwoven stoles & statement dupattas",
     "image": DUPATTA_IMG[0], "sort_order": 4, "is_active": True, "show_in_navbar": True, "show_in_catalog": True},
    {"key": "bridal-edit", "name": "Bridal Edit", "description": "Curated trousseau pieces, launching soon",
     "image": BRIDAL_IMG[0], "sort_order": 5, "is_active": False, "show_in_navbar": False, "show_in_catalog": False},
]

# ---------------------------------------------------------------------------
# Staff + customers. Passwords are real bcrypt hashes (via hash_password) --
# every one of these can actually log in with the password shown here.
# ---------------------------------------------------------------------------
CUSTOMER_PASSWORD = "RariShop@2026"

CUSTOMERS = [
    {"name": "Priya Sharma", "email": "priya.sharma@example.com", "phone": "+919820011111",
     "address1": "14 Sunrise Apartments, Linking Road", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"},
    {"name": "Ananya Iyer", "email": "ananya.iyer@example.com", "phone": "+919845022222",
     "address1": "27 Indiranagar 100ft Road", "city": "Bengaluru", "state": "Karnataka", "pincode": "560001"},
    {"name": "Kavya Reddy", "email": "kavya.reddy@example.com", "phone": "+919030033333",
     "address1": "9 Banjara Hills Road No. 3", "city": "Hyderabad", "state": "Telangana", "pincode": "500001"},
    {"name": "Meera Nair", "email": "meera.nair@example.com", "phone": "+919447044444",
     "address1": "45 Marine Drive Residency", "city": "Kochi", "state": "Kerala", "pincode": "682001"},
    {"name": "Riya Kapoor", "email": "riya.kapoor@example.com", "phone": "+919810055555",
     "address1": "B-12 Greater Kailash Part 1", "city": "Delhi", "state": "Delhi", "pincode": "110001"},
    {"name": "Sneha Patel", "email": "sneha.patel@example.com", "phone": "+919898066666",
     "address1": "302 Shreeji Tower, CG Road", "city": "Ahmedabad", "state": "Gujarat", "pincode": "380001"},
    {"name": "Divya Menon", "email": "divya.menon@example.com", "phone": "+919444077777",
     "address1": "18 T Nagar Main Road", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600001"},
    {"name": "Anjali Desai", "email": "anjali.desai@example.com", "phone": "+919724088888",
     "address1": "7 Vesu Canal Road", "city": "Surat", "state": "Gujarat", "pincode": "395001"},
    {"name": "Pooja Verma", "email": "pooja.verma@example.com", "phone": "+919414099999",
     "address1": "22 Malviya Nagar", "city": "Jaipur", "state": "Rajasthan", "pincode": "302001"},
    {"name": "Neha Joshi", "email": "neha.joshi@example.com", "phone": "+919822010101",
     "address1": "5 Koregaon Park Lane 6", "city": "Pune", "state": "Maharashtra", "pincode": "411001"},
    {"name": "Ishita Rao", "email": "ishita.rao@example.com", "phone": "+919830020202",
     "address1": "11 Park Street Apartments", "city": "Kolkata", "state": "West Bengal", "pincode": "700001"},
    {"name": "Tanvi Bhatt", "email": "tanvi.bhatt@example.com", "phone": "+919827030303",
     "address1": "63 Vijay Nagar", "city": "Indore", "state": "Madhya Pradesh", "pincode": "452001"},
    {"name": "Aarav Mehta", "email": "aarav.mehta@example.com", "phone": "+919823040404",
     "address1": "8 Civil Lines", "city": "Nagpur", "state": "Maharashtra", "pincode": "440001",
     "google": True, "picture": AVATAR_IMG[0]},
    {"name": "Kabir Malhotra", "email": "kabir.malhotra@example.com", "phone": "+919814050505",
     "address1": "SCO 34, Sector 17", "city": "Chandigarh", "state": "Chandigarh", "pincode": "160001",
     "google": True, "picture": AVATAR_IMG[1]},
    {"name": "Simran Kaur", "email": "simran.kaur@example.com", "phone": "+919814060606",
     "address1": "19 Model Town", "city": "Ludhiana", "state": "Punjab", "pincode": "141001", "is_active": False},
    {"name": "Yuvika Chawla", "email": "yuvika.chawla@example.com", "phone": "+919864070707",
     "address1": "3 Zoo Road Tiniali", "city": "Guwahati", "state": "Assam", "pincode": "781001"},
]

GUEST_ADDRESSES = [
    {"address1": "12 Silver Oak Residency", "city": "Surat", "state": "Gujarat", "pincode": "395007"},
    {"address1": "56 Bandra West, Hill Road", "city": "Mumbai", "state": "Maharashtra", "pincode": "400050"},
    {"address1": "21 Anna Salai", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600002"},
    {"address1": "40 MG Road", "city": "Bengaluru", "state": "Karnataka", "pincode": "560002"},
]

PENDING_SIGNUPS = [
    {"name": "Rhea Kulkarni", "email": "rhea.kulkarni@example.com", "phone": "+919900011122"},
    {"name": "Zoya Ahmed", "email": "zoya.ahmed@example.com", "phone": "+919900033344"},
]

# ---------------------------------------------------------------------------
# Products: 32 across 5 categories, spanning every flag/status combination
# the UI and repositories actually branch on.
# ---------------------------------------------------------------------------
PRODUCTS = [
    # -- kurtis (8) --
    dict(name="Ivory Chikankari Kurti", categories=["kurtis"], price=1299, compare_at_price=1799,
         fabric="Pure Cotton with hand chikankari embroidery", colors=["Ivory"], color_hex=["#F3EEE2"],
         sizes=["XS", "S", "M", "L", "XL", "XXL"], occasion=["Casual", "Daily Wear"], stock=14, is_bestseller=True),
    dict(name="Marigold Thread-Work Kurti", categories=["kurtis"], price=1599, compare_at_price=None,
         fabric="Rayon with marigold thread embroidery", colors=["Marigold"], color_hex=["#E8A33D"],
         sizes=["S", "M", "L", "XL"], occasion=["Festive", "Family Function"], stock=9, is_new=True),
    dict(name="Teal Block-Print Cotton Kurti", categories=["kurtis"], price=999, compare_at_price=1299,
         fabric="Cotton, hand block-printed", colors=["Teal"], color_hex=["#1E5F5A"],
         sizes=["XS", "S", "M", "L", "XL", "XXL"], occasion=["Casual", "Daily Wear", "Office Wear"], stock=22),
    dict(name="Blush Pink Georgette Kurti", categories=["kurtis"], price=1899, compare_at_price=2399,
         fabric="Georgette with sequin border", colors=["Blush Pink"], color_hex=["#E8B4B8"],
         sizes=["S", "M", "L", "XL"], occasion=["Festive", "Navratri", "Party"], stock=6, is_bestseller=True,
         is_navratri=True, navratri_day="Day 2 - Blush Pink", edit_tag="Garba Ready"),
    dict(name="Mustard Chanderi Kurti", categories=["kurtis"], price=1699, compare_at_price=None,
         fabric="Chanderi silk-cotton blend", colors=["Mustard"], color_hex=["#C89B3C"],
         sizes=["S", "M", "L", "XL", "XXL"], occasion=["Festive", "Office Wear"], stock=11, is_new=True),
    dict(name="Maroon Velvet Kurti", categories=["kurtis"], price=2199, compare_at_price=2699,
         fabric="Velvet with zari border", colors=["Maroon"], color_hex=["#6B1F2A"],
         sizes=["S", "M", "L"], occasion=["Festive", "Navratri", "Family Function"], stock=3,
         is_navratri=True, navratri_day="Day 3 - Maroon", edit_tag="Family Function"),
    dict(name="Charcoal Straight-Cut Kurti", categories=["kurtis"], price=1399, compare_at_price=None,
         fabric="Cotton slub", colors=["Charcoal"], color_hex=["#3B3B3D"],
         sizes=["S", "M", "L", "XL"], occasion=["Daily Wear", "Office Wear"], stock=8, is_active=False),
    dict(name="White Chikankari Festive Kurti", categories=["kurtis"], price=2499, compare_at_price=2999,
         fabric="Pure Cotton chikankari, festive weight", colors=["White"], color_hex=["#F7F5EF"],
         sizes=["XS", "S", "M", "L", "XL"], occasion=["Festive", "Navratri"], stock=0, is_bestseller=True,
         is_navratri=True, navratri_day="Day 7 - White"),

    # -- suits (7) --
    dict(name="Peacock Green Palazzo Suit Set", categories=["suits"], price=2899, compare_at_price=3499,
         fabric="Georgette with gota-patti work", colors=["Peacock Green"], color_hex=["#0F6E5C"],
         sizes=["S", "M", "L", "XL"], occasion=["Festive", "Navratri", "Party"], stock=5, is_bestseller=True,
         is_navratri=True, navratri_day="Day 9 - Peacock Green", edit_tag="Garba Ready"),
    dict(name="Rani Pink Sharara Suit", categories=["suits"], price=3299, compare_at_price=3899,
         fabric="Silk with mirror embroidery", colors=["Rani Pink"], color_hex=["#C2185B"],
         sizes=["S", "M", "L", "XL"], occasion=["Wedding", "Festive"], stock=10, is_bestseller=True),
    dict(name="Sage Green Straight Suit", categories=["suits"], price=2199, compare_at_price=None,
         fabric="Cotton with thread embroidery", colors=["Sage Green"], color_hex=["#8CA894"],
         sizes=["XS", "S", "M", "L", "XL", "XXL"], occasion=["Office Wear", "Daily Wear"], stock=18),
    dict(name="Wine Velvet Anarkali Suit", categories=["suits"], price=3699, compare_at_price=4299,
         fabric="Velvet with zardozi neckline", colors=["Wine"], color_hex=["#5B0E1E"],
         sizes=["S", "M", "L"], occasion=["Festive", "Navratri", "Wedding"], stock=2,
         is_navratri=True, navratri_day="Day 3 - Maroon"),
    dict(name="Powder Blue Chanderi Suit", categories=["suits"], price=2599, compare_at_price=2999,
         fabric="Chanderi silk-cotton", colors=["Powder Blue"], color_hex=["#A9C6E8"],
         sizes=["S", "M", "L", "XL"], occasion=["Festive", "Family Function"], stock=14, is_new=True),
    dict(name="Coral Chiffon Palazzo Suit", categories=["suits"], price=2999, compare_at_price=None,
         fabric="Chiffon with sequin dupatta", colors=["Coral"], color_hex=["#E8735A"],
         sizes=["S", "M", "L", "XL"], occasion=["Party", "Festive"], stock=7, is_new=True, is_bestseller=True),
    dict(name="Grey Cotton Daily-Wear Suit", categories=["suits"], price=1999, compare_at_price=2299,
         fabric="Cotton", colors=["Grey"], color_hex=["#8B8D8F"],
         sizes=["S", "M", "L", "XL", "XXL"], occasion=["Daily Wear", "Office Wear"], stock=20, is_active=False),

    # -- lehengas (7) --
    dict(name="Maroon Mirror-Work Garba Lehenga", categories=["lehengas"], price=4499, compare_at_price=4999,
         fabric="Georgette with mirror-work", colors=["Maroon"], color_hex=["#6B1F2A"],
         sizes=["S", "M", "L", "XL"], occasion=["Navratri", "Festive", "Party"], stock=4, is_bestseller=True,
         is_navratri=True, navratri_day="Day 3 - Maroon", edit_tag="Garba Ready"),
    dict(name="Peacock Blue Sequin Lehenga", categories=["lehengas"], price=4299, compare_at_price=None,
         fabric="Net with sequin work", colors=["Peacock Blue"], color_hex=["#155E75"],
         sizes=["S", "M", "L"], occasion=["Navratri", "Party"], stock=3,
         is_navratri=True, navratri_day="Day 6 - Peacock Blue"),
    dict(name="Yellow Banarasi Lehenga", categories=["lehengas"], price=3899, compare_at_price=4499,
         fabric="Banarasi Silk", colors=["Yellow"], color_hex=["#E8C13D"],
         sizes=["S", "M", "L", "XL"], occasion=["Navratri", "Wedding", "Festive"], stock=6, is_bestseller=True,
         is_navratri=True, navratri_day="Day 5 - Yellow"),
    dict(name="Ivory Organza Reception Lehenga", categories=["lehengas"], price=5999, compare_at_price=6999,
         fabric="Organza with hand embroidery", colors=["Ivory"], color_hex=["#F3EEE2"],
         sizes=["S", "M", "L"], occasion=["Wedding", "Party"], stock=2, is_new=True,
         shipping_enabled=True, shipping_charge=299),
    dict(name="Emerald Green Chaniya Choli", categories=["lehengas"], price=3499, compare_at_price=None,
         fabric="Satin with foil print", colors=["Emerald Green"], color_hex=["#0B6E4F"],
         sizes=["S", "M", "L", "XL"], occasion=["Navratri", "Festive"], stock=9,
         is_navratri=True, navratri_day="Day 4 - Green"),
    dict(name="Rose Gold Net Lehenga", categories=["lehengas"], price=4199, compare_at_price=4799,
         fabric="Net with sequin and thread work", colors=["Rose Gold"], color_hex=["#B76E79"],
         sizes=["S", "M", "L", "XL"], occasion=["Wedding", "Party", "Festive"], stock=5, is_new=True, is_bestseller=True),
    dict(name="Coral Crepe Chaniya Choli", categories=["lehengas"], price=2899, compare_at_price=3299,
         fabric="Crepe with mirror border", colors=["Coral"], color_hex=["#E8735A"],
         sizes=["S", "M", "L"], occasion=["Navratri", "Party"], stock=12, is_active=False),

    # -- dupattas (6, free-size accessories) --
    dict(name="Banarasi Silk Dupatta - Maroon", categories=["dupattas"], price=1299, compare_at_price=1599,
         fabric="Banarasi Silk", colors=["Maroon"], color_hex=["#6B1F2A"],
         sizes=["Free Size"], occasion=["Wedding", "Festive"], stock=15, is_bestseller=True),
    dict(name="Chikankari Cotton Dupatta - Ivory", categories=["dupattas"], price=799, compare_at_price=None,
         fabric="Cotton chikankari", colors=["Ivory"], color_hex=["#F3EEE2"],
         sizes=["Free Size"], occasion=["Casual", "Daily Wear"], stock=25),
    dict(name="Mirror-Work Net Dupatta - Peacock", categories=["dupattas"], price=1099, compare_at_price=1399,
         fabric="Net with mirror-work", colors=["Peacock Blue"], color_hex=["#155E75"],
         sizes=["Free Size"], occasion=["Navratri", "Festive"], stock=8,
         is_navratri=True, navratri_day="Day 6 - Peacock Blue"),
    dict(name="Chanderi Zari-Border Dupatta - Gold", categories=["dupattas"], price=1499, compare_at_price=1899,
         fabric="Chanderi with zari border", colors=["Gold"], color_hex=["#C9A227"],
         sizes=["Free Size"], occasion=["Wedding", "Festive"], stock=10, is_new=True),
    dict(name="Organza Floral Dupatta - Blush", categories=["dupattas"], price=999, compare_at_price=None,
         fabric="Organza with floral print", colors=["Blush Pink"], color_hex=["#E8B4B8"],
         sizes=["Free Size"], occasion=["Party", "Casual"], stock=18),
    dict(name="Phulkari Cotton Dupatta - Multicolor", categories=["dupattas"], price=1199, compare_at_price=1499,
         fabric="Cotton, hand Phulkari embroidery", colors=["Multicolor"], color_hex=["#C9A227"],
         sizes=["Free Size"], occasion=["Festive", "Casual"], stock=1, is_bestseller=True),

    # -- bridal-edit (4; category hidden but products still directly reachable) --
    dict(name="Crimson Zardozi Bridal Lehenga", categories=["bridal-edit"], price=11999, compare_at_price=13999,
         fabric="Silk with zardozi and stonework", colors=["Crimson"], color_hex=["#8B1E2E"],
         sizes=["S", "M", "L"], occasion=["Wedding"], stock=2, shipping_enabled=True, shipping_charge=499),
    dict(name="Champagne Sequin Reception Gown-Lehenga", categories=["bridal-edit"], price=8999, compare_at_price=None,
         fabric="Net with sequin work", colors=["Champagne"], color_hex=["#D8C7A1"],
         sizes=["S", "M", "L"], occasion=["Wedding", "Party"], stock=3, shipping_enabled=True, shipping_charge=399),
    dict(name="Deep Red Banarasi Bridal Set", categories=["bridal-edit"], price=9999, compare_at_price=11499,
         fabric="Banarasi Silk", colors=["Deep Red"], color_hex=["#7A1129"],
         sizes=["S", "M", "L"], occasion=["Wedding"], stock=0, is_new=True),
    dict(name="Gold Zari Bridal Dupatta", categories=["bridal-edit"], price=2999, compare_at_price=3499,
         fabric="Silk with zari border", colors=["Gold"], color_hex=["#C9A227"],
         sizes=["Free Size"], occasion=["Wedding"], stock=6),
]

CATEGORY_IMG_POOL = {
    "kurtis": KURTI_IMG, "suits": SUIT_IMG, "lehengas": LEHENGA_IMG,
    "dupattas": DUPATTA_IMG, "bridal-edit": BRIDAL_IMG,
}

CARE_BY_FABRIC_HINT = "Dry clean recommended. Iron on medium heat, reverse side."
FIT_NOTES = "True to size. Model wears M unless noted."
DESC_TEMPLATE = "Handcrafted in Surat with breathable, festive-ready fabric. Cut for comfort and made to move."


# ---------------------------------------------------------------------------
# Orders. Each entry: customer email (None = guest), line items (slug, qty,
# size), status, payment method, and how many days/hours ago it was placed
# (and delivered, for delivered orders). Prices are resolved from PRODUCTS at
# insert time so subtotal/shipping/total always match real product prices --
# same rule OrderService.create enforces on live orders.
# ---------------------------------------------------------------------------
ORDERS = [
    (None, [("ivory-chikankari-kurti", 1, "M")], "confirmed", "COD", 2, None),
    ("priya.sharma@example.com", [("marigold-thread-work-kurti", 1, "L"), ("teal-block-print-cotton-kurti", 2, "S")],
     "delivered", "COD", 40, 32),
    ("priya.sharma@example.com", [("peacock-green-palazzo-suit-set", 1, "M")], "delivered", "razorpay", 12, 6),
    ("priya.sharma@example.com", [("rani-pink-sharara-suit", 1, "S")], "dispatched", "COD", 4, None),
    ("ananya.iyer@example.com", [("maroon-mirror-work-garba-lehenga", 1, "M")], "delivered", "COD", 50, 40),
    ("ananya.iyer@example.com", [("yellow-banarasi-lehenga", 1, "L"), ("banarasi-silk-dupatta-maroon", 1, "Free Size")],
     "confirmed", "razorpay", 3, None),
    ("ananya.iyer@example.com", [("crimson-zardozi-bridal-lehenga", 1, "S")], "pending_payment", "razorpay", 0, None, 3),
    ("kavya.reddy@example.com", [("rose-gold-net-lehenga", 1, "M")], "pending_payment", "razorpay", 1, None),
    ("kavya.reddy@example.com", [("teal-block-print-cotton-kurti", 1, "M"), ("ivory-chikankari-kurti", 1, "L")],
     "delivered", "COD", 18, 11),
    ("meera.nair@example.com", [("blush-pink-georgette-kurti", 1, "S")], "delivered", "COD", 10, 4),
    ("meera.nair@example.com", [("mustard-chanderi-kurti", 2, "M")], "confirmed", "COD", 5, None),
    ("riya.kapoor@example.com", [("sage-green-straight-suit", 1, "L")], "cancelled", "COD", 25, None),
    ("sneha.patel@example.com", [("coral-chiffon-palazzo-suit", 1, "M"), ("chikankari-cotton-dupatta-ivory", 1, "Free Size")],
     "delivered", "COD", 60, 50),
    ("sneha.patel@example.com", [("emerald-green-chaniya-choli", 1, "S")], "dispatched", "razorpay", 6, None),
    ("divya.menon@example.com", [("mirror-work-net-dupatta-peacock", 2, "Free Size")], "confirmed", "COD", 2, None),
    ("pooja.verma@example.com", [("chanderi-zari-border-dupatta-gold", 1, "Free Size"), ("organza-floral-dupatta-blush", 1, "Free Size")],
     "delivered", "COD", 45, 38),
    ("pooja.verma@example.com", [("coral-crepe-chaniya-choli", 1, "M")], "delivered", "COD", 70, 62),
    ("neha.joshi@example.com", [("ivory-organza-reception-lehenga", 1, "M")], "dispatched", "razorpay", 5, None),
    ("ishita.rao@example.com", [("crimson-zardozi-bridal-lehenga", 1, "M")], "pending_payment", "razorpay", 0, None, 12),
    ("tanvi.bhatt@example.com", [("champagne-sequin-reception-gown-lehenga", 1, "L")], "delivered", "COD", 9, 3),
    ("tanvi.bhatt@example.com", [("rani-pink-sharara-suit", 1, "M")], "pending_payment", "razorpay", 0, None, 2),
    ("aarav.mehta@example.com", [("deep-red-banarasi-bridal-set", 1, "M")], "confirmed", "razorpay", 2, None),
    ("kabir.malhotra@example.com", [("gold-zari-bridal-dupatta", 2, "Free Size")], "confirmed", "COD", 1, None),
    ("simran.kaur@example.com", [("white-chikankari-festive-kurti", 1, "L")], "delivered", "COD", 100, 90),
    ("yuvika.chawla@example.com", [("phulkari-cotton-dupatta-multicolor", 1, "Free Size")], "delivered", "COD", 8, 2),
    ("yuvika.chawla@example.com", [("wine-velvet-anarkali-suit", 1, "M")], "confirmed", "razorpay", 3, None),
    ("yuvika.chawla@example.com", [("powder-blue-chanderi-suit", 1, "S"), ("grey-cotton-daily-wear-suit", 1, "M")],
     "dispatched", "COD", 4, None),
    (None, [("peacock-blue-sequin-lehenga", 1, "L")], "confirmed", "COD", 2, None),
    (None, [("banarasi-silk-dupatta-maroon", 3, "Free Size")], "delivered", "COD", 55, 47),
    (None, [("marigold-thread-work-kurti", 1, "S")], "cancelled", "razorpay", 20, None),
    (None, [("rose-gold-net-lehenga", 1, "S")], "confirmed", "razorpay", 1, None),
    (None, [("champagne-sequin-reception-gown-lehenga", 1, "M")], "pending_payment", "razorpay", 0, None, 6),
]

# (order index into ORDERS, status, reason, notes, admin_note, created_days_ago, updated_days_ago)
EXCHANGE_REQUESTS = [
    (2, "pending", "Size issue", "", "", 1, 1),
    (9, "pending", "Color/design not as expected", "", "", 2, 2),
    (19, "pending", "Changed my mind", "", "", 1, 1),
    (25, "approved", "Damaged or defective", "Arrived with a small tear near the hem.",
     "Replacement dispatched", 1, 0),
    (8, "approved", "Size issue", "Need one size up.", "Approved, awaiting return pickup", 5, 4),
    (1, "completed", "Size issue", "Need size L instead of M.", "Exchanged for size L, delivered", 25, 20),
    (4, "rejected", "Changed my mind", "", "Mind-change not covered for festive-wear final sale items", 30, 29),
    (12, "completed", "Damaged or defective", "Loose thread on the dupatta border.",
     "Replacement shipped and delivered", 42, 38),
    (15, "rejected", "Other", "Wanted a different fabric entirely, not a defect.",
     "Not eligible -- request was for a different product, not an exchange of the same item", 28, 27),
]

CARTS = [
    ("divya.menon@example.com", [("mirror-work-net-dupatta-peacock", 1, "Free Size")]),
    ("yuvika.chawla@example.com", [("crimson-zardozi-bridal-lehenga", 1, "M"), ("gold-zari-bridal-dupatta", 1, "Free Size")]),
    ("anjali.desai@example.com", [("ivory-chikankari-kurti", 2, "M"), ("mustard-chanderi-kurti", 1, "L")]),
]

SUBSCRIBERS = [
    {"email": "asha.kulkarni@example.com", "phone": None, "source": "footer"},
    {"email": "vikram.singh@example.com", "phone": None, "source": "footer"},
    {"email": None, "phone": "+919812345001", "source": "footer"},
    {"email": "farah.sheikh@example.com", "phone": "+919812345002", "source": "footer"},
    {"email": "ritu.agarwal@example.com", "phone": None, "source": "footer"},
    {"email": None, "phone": "+919812345003", "source": "footer"},
    {"email": "manisha.rao@example.com", "phone": "+919812345004", "source": "footer"},
    {"email": "deepika.pillai@example.com", "phone": None, "source": "footer"},
    {"email": "sanjana.bose@example.com", "phone": "+919812345005", "source": "footer"},
    {"email": "kiran.thakur@example.com", "phone": None, "source": "footer"},
]

CONTACT_MESSAGES = [
    {"name": "Ritika Suri", "email": "ritika.suri@example.com", "phone": "+919812340011",
     "message": "Hi, do you have the Maroon Mirror-Work Garba Lehenga in size XL? Couldn't find it on the site."},
    {"name": "Amit Trivedi", "email": "amit.trivedi@example.com", "phone": None,
     "message": "My order RE placed last week still shows 'confirmed'. When will it ship? Need it before Navratri."},
    {"name": "Sonal Gupta", "email": "sonal.gupta@example.com", "phone": "+919812340022",
     "message": "Can you custom-stitch the Crimson Zardozi Bridal Lehenga to my measurements? It's for my wedding in December."},
    {"name": "Nikhil Bansal", "email": "nikhil.bansal@example.com", "phone": "+919812340033",
     "message": "The kurti I received has a slightly different shade than shown in photos. Is that expected with hand-dyed fabric?"},
    {"name": "Payal Chhabra", "email": "payal.chhabra@example.com", "phone": None,
     "message": "Do you ship internationally? I'm in Dubai and want to order a few pieces for a family function."},
    {"name": "Rohan Kapadia", "email": "rohan.kapadia@example.com", "phone": "+919812340044",
     "message": "Loved the Rose Gold Net Lehenga on Instagram! Is Cash on Delivery available for Chennai?"},
    {"name": "Vidya Subramaniam", "email": "vidya.subramaniam@example.com", "phone": None,
     "message": "Requesting a size chart with actual measurements (bust/waist/length), the S/M/L labels aren't enough for me to decide."},
    {"name": "Karan Oberoi", "email": "karan.oberoi@example.com", "phone": "+919812340055",
     "message": "I want to exchange a kurti for a different color, but the order was placed as a guest. How do I proceed?"},
    {"name": "Shreya Dutta", "email": "shreya.dutta@example.com", "phone": None,
     "message": "Are the dupattas sold separately from the suits, or only as sets? Want to mix and match."},
    {"name": "Aditya Rane", "email": "aditya.rane@example.com", "phone": "+919812340066",
     "message": "Placed order for Navratri delivery -- please confirm it'll reach Nagpur by Oct 10."},
]


async def main() -> None:
    database.connect()
    async with database.get_session() as session:
        # --- wipe, FK-safe (children before parents) -----------------------
        for model in (ExchangeRequestRow, CartRow, OrderRow, OtpRow, RefreshSessionRow, PasswordResetRow, CampaignAuditLogRow):
            await session.execute(delete(model))
        await session.execute(delete(ProductRow))
        await session.execute(delete(CategoryRow))
        await session.execute(delete(UserRow))
        await session.execute(delete(CampaignRow))
        await session.execute(delete(SubscriberRow))
        await session.execute(delete(ContactMessageRow))
        await session.commit()

        # --- categories ------------------------------------------------------
        for c in CATEGORIES:
            session.add(CategoryRow(id=str(uuid.uuid4()), created_at=ago(200), **c))
        await session.commit()

        # --- staff + customers -------------------------------------------
        users_by_email = {}

        def add_user(**kw):
            now = ago(kw.pop("joined_days_ago", 30))
            row = UserRow(id=str(uuid.uuid4()), created_at=now, updated_at=now, **kw)
            session.add(row)
            users_by_email[kw["email"]] = row
            return row

        if app_settings.admin_email:
            add_user(name="Admin", email=app_settings.admin_email,
                      password_hash=hash_password(app_settings.admin_password or "change-me"),
                      role="admin", is_active=True, email_verified=True, joined_days_ago=365)
        if app_settings.super_admin_email:
            add_user(name="Super Admin", email=app_settings.super_admin_email,
                      password_hash=hash_password(app_settings.super_admin_password or "change-me"),
                      role="super_admin", is_active=True, email_verified=True, joined_days_ago=365)
        add_user(name="Arjun Nair", email="staff@rariethnic.com", password_hash=hash_password(CUSTOMER_PASSWORD),
                  role="admin", is_active=True, email_verified=True, joined_days_ago=200)

        customers_by_email = {c["email"]: c for c in CUSTOMERS}
        for i, c in enumerate(CUSTOMERS):
            add_user(
                name=c["name"], email=c["email"],
                password_hash=None if c.get("google") else hash_password(CUSTOMER_PASSWORD),
                role="customer", is_active=c.get("is_active", True), email_verified=True,
                picture=c.get("picture"), google_sub=(f"google-sub-{i:04d}" if c.get("google") else None),
                phone=c["phone"], joined_days_ago=120 - i * 3,
            )
        await session.commit()

        # --- pending (unverified) signups: OTP row only, no user row ------
        # Abandoned signups (code never verified, window expired) -- a
        # realistic edge case, not an active/usable code.
        for p in PENDING_SIGNUPS:
            otp_created_at = ago(0, 2)
            session.add(OtpRow(
                id=str(uuid.uuid4()), email=p["email"], code_hash=hashlib.sha256(b"000000").hexdigest(),
                registration={"name": p["name"], "email": p["email"], "phone": p["phone"],
                              "password_hash": hash_password(CUSTOMER_PASSWORD)},
                attempts=0, expires_at=otp_created_at + timedelta(minutes=10), used=False, created_at=otp_created_at,
            ))
        await session.commit()

        # --- products ------------------------------------------------------
        products_by_slug = {}
        for i, p in enumerate(PRODUCTS):
            p = dict(p)
            slug = slugify(p["name"])
            pool = CATEGORY_IMG_POOL[p["categories"][0]]
            row = ProductRow(
                id=str(uuid.uuid4()), slug=slug, name=p["name"], categories=p["categories"],
                price=p["price"], compare_at_price=p.get("compare_at_price"),
                description=DESC_TEMPLATE, fabric=p["fabric"], care=CARE_BY_FABRIC_HINT, fit_notes=FIT_NOTES,
                occasion=p.get("occasion", []), sizes=p.get("sizes", []), colors=p.get("colors", []),
                color_hex=p.get("color_hex", []), images=imgs(pool, i), stock=p.get("stock", 5),
                is_bestseller=p.get("is_bestseller", False), is_new=p.get("is_new", False),
                is_navratri=p.get("is_navratri", False), is_active=p.get("is_active", True),
                navratri_day=p.get("navratri_day"), edit_tag=p.get("edit_tag"),
                shipping_enabled=p.get("shipping_enabled", False), shipping_charge=p.get("shipping_charge", 0),
                created_at=ago(90 - i * 2),
            )
            session.add(row)
            products_by_slug[slug] = row
        await session.commit()

        # --- carts -----------------------------------------------------------
        for email, items in CARTS:
            user = users_by_email[email]
            cart_items = []
            for slug, qty, size in items:
                pr = products_by_slug[slug]
                cart_items.append({"product_id": pr.id, "slug": slug, "name": pr.name, "price": pr.price,
                                    "quantity": qty, "size": size, "image": pr.images[0]})
            session.add(CartRow(user_id=user.id, items=cart_items, updated_at=ago(0, 6)))
        await session.commit()

        # --- orders ------------------------------------------------------
        order_rows = []
        guest_names = ["Kiran Shah", "Rohit Malviya", "Fatima Ansari", "Devansh Pandey"]
        guest_counter = 0
        for spec in ORDERS:
            email, items, status, payment_method, days_ago, delivered_days_ago = (spec + (None,))[:6]
            pending_hours = spec[6] if len(spec) > 6 else None
            user = users_by_email.get(email) if email else None
            customer = customers_by_email.get(email) if email else None

            resolved_items, subtotal, shipping_surcharge, has_override = [], 0, 0, False
            for slug, qty, size in items:
                pr = products_by_slug[slug]
                subtotal += pr.price * qty
                if pr.shipping_enabled:
                    has_override = True
                    shipping_surcharge += pr.shipping_charge * qty
                resolved_items.append({"product_id": pr.id, "slug": slug, "name": pr.name, "price": pr.price,
                                        "quantity": qty, "size": size, "image": pr.images[0]})
            shipping = shipping_surcharge if has_override else 0
            total = subtotal + shipping

            created_at = ago(hours=pending_hours) if pending_hours is not None else ago(days=days_ago)
            delivered_at = ago(days=delivered_days_ago) if delivered_days_ago is not None else None

            razorpay_order_id = f"order_{uuid.uuid4().hex[:14]}" if payment_method == "razorpay" else None
            razorpay_payment_id = (
                f"pay_{uuid.uuid4().hex[:14]}" if payment_method == "razorpay" and status != "pending_payment" else None
            )

            if user:
                name, cust_email, phone = user.name, user.email, user.phone
                address1, addr2, city, state, pincode = customer["address1"], None, customer["city"], customer["state"], customer["pincode"]
            else:
                ga = GUEST_ADDRESSES[guest_counter % len(GUEST_ADDRESSES)]
                name = guest_names[guest_counter % len(guest_names)]
                guest_counter += 1
                cust_email = f"{slugify(name)}@example.com"
                phone = f"+9198{10000000 + guest_counter:08d}"[:13]
                address1, addr2 = ga["address1"], None
                city, state, pincode = ga["city"], ga["state"], ga["pincode"]

            row = OrderRow(
                id=str(uuid.uuid4()), order_number="RE" + uuid.uuid4().hex[:8].upper(), user_id=user.id if user else None,
                customer_name=name, email=cust_email, phone=phone,
                address_line1=address1, address_line2=addr2, city=city, state=state, pincode=pincode,
                notes=None, items=resolved_items, subtotal=subtotal, shipping=shipping, total=total,
                payment_method=payment_method, status=status, delivered_at=delivered_at,
                razorpay_order_id=razorpay_order_id, razorpay_payment_id=razorpay_payment_id,
                created_at=created_at,
            )
            session.add(row)
            order_rows.append(row)
        await session.commit()

        # --- exchange requests ---------------------------------------------
        for order_idx, status, reason, notes, admin_note, created_days_ago, updated_days_ago in EXCHANGE_REQUESTS:
            order = order_rows[order_idx]
            session.add(ExchangeRequestRow(
                id=str(uuid.uuid4()), order_id=order.id, order_number=order.order_number, user_id=order.user_id,
                customer_name=order.customer_name, email=order.email, phone=order.phone, order_total=order.total,
                reason=reason, notes=notes, status=status, admin_note=admin_note,
                created_at=ago(created_days_ago), updated_at=ago(updated_days_ago),
            ))
        await session.commit()

        # --- campaigns ---------------------------------------------------
        # Five events spanning both themes, every section type, every product
        # filter shape, both attribute_grid layouts, and page lengths from 4
        # sections to 9 -- a tour of what the page builder can do. Only
        # Navratri is `is_active` (the app only ever renders one event live at
        # a time); the rest are drafts an admin can open in the builder or
        # flip live to preview.
        def _sec(section_type, config):
            return {"id": str(uuid.uuid4()), "type": section_type, "enabled": True, "config": config}

        day_colours = [
            ("Day 1", "Grey", "#8B8D8F", "Grace and new beginnings"), ("Day 2", "Orange", "#D97B29", "Energy and warmth"),
            ("Day 3", "White", "#F7F5EF", "Peace and purity"), ("Day 4", "Red", "#8B1E2E", "Passion and vigour"),
            ("Day 5", "Royal Blue", "#1E3A5F", "Prosperity and calm"), ("Day 6", "Yellow", "#E8C13D", "Happiness and brightness"),
            ("Day 7", "Green", "#0B6E4F", "Growth and harmony"), ("Day 8", "Peacock Green", "#0F6E5C", "Individuality and uniqueness"),
            ("Day 9", "Pink", "#C2185B", "Universal love and compassion"),
        ]
        session.add(CampaignRow(
            id=str(uuid.uuid4()), name="Navratri 2026", slug="navratri", is_active=True, theme="festive",
            countdown_target=NOW + timedelta(days=14), countdown_label="Navratri arrives in",
            sections=[
                _sec("hero", {
                    "eyebrow": "Navratri Collection · 2026", "title": "Nine nights. Nine colours. One you.",
                    "subtitle": "Garba-ready lehengas and cholis, cut for movement and made to twirl.",
                    "image": LEHENGA_IMG[0], "image_crop": None, "secondary_image": LEHENGA_IMG[1], "secondary_image_crop": None,
                    "cta_label": "Shop the Navratri Edit", "cta_anchor": "navratri-drop",
                    "order_by_note": "Order by Oct 15 for guaranteed delivery before Day 1",
                }),
                _sec("shloka", {
                    "quote": "या देवी सर्वभूतेषु शक्ति-रूपेण संस्थिता। नमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः॥",
                    "translation": "To the Goddess who resides in all beings in the form of power -- salutations to her, again and again.",
                }),
                _sec("product_grid", {
                    "heading": "Navratri Collection", "subheading": "The full drop", "filter": {"is_navratri": True},
                    "empty_state_message": "New Navratri pieces coming soon. Follow us on WhatsApp to know first.",
                }),
                _sec("product_grid", {"heading": "Garba Ready", "subheading": "Curated edit", "filter": {"edit_tag": "Garba Ready"}, "empty_state_message": ""}),
                _sec("attribute_grid", {
                    "heading": "Day 1-9 Colours", "subheading": "Every day carries its colour. Wear yours with intention.",
                    "layout": "badges",
                    "items": [{"order": i + 1, "title": f"{d[0]} - {d[1]}", "subtitle": d[1], "description": d[3], "color": d[2], "icon": None}
                              for i, d in enumerate(day_colours)],
                }),
                _sec("attribute_grid", {"heading": "Schedule", "subheading": "", "layout": "list", "items": [
                    {"order": 1, "title": "Ghatasthapana", "subtitle": "Oct 12, 6:00 AM", "description": "The ritual that marks the start of Navratri.", "color": None, "icon": None},
                    {"order": 2, "title": "Garba Nights", "subtitle": "Oct 12 - Oct 19", "description": "Nine nights of Garba and Dandiya Raas.", "color": None, "icon": None},
                    {"order": 3, "title": "Ashtami Puja", "subtitle": "Oct 19", "description": "Kanya Pujan and the eighth-day rituals.", "color": None, "icon": None},
                    {"order": 4, "title": "Dussehra", "subtitle": "Oct 20", "description": "Victory of good over evil, marking the end of Navratri.", "color": None, "icon": None},
                ]}),
                _sec("attribute_grid", {"heading": "Special Offers", "subheading": "", "layout": "list", "items": [
                    {"order": 1, "title": "Free shipping", "subtitle": "On orders above ₹2,999", "description": "", "color": None, "icon": None},
                    {"order": 2, "title": "Extra 10% off", "subtitle": "On the Navratri Edit", "description": "Applied automatically at checkout.", "color": None, "icon": None},
                ]}),
                _sec("product_grid", {"heading": "Family Function", "subheading": "Curated edit", "filter": {"edit_tag": "Family Function"}, "empty_state_message": ""}),
                _sec("urgency_banner", {
                    "heading": "Pre-order now for guaranteed pre-Navratri delivery.", "subtext": "Limited stock · Made-to-measure closing soon",
                    "cta_label": "Reserve your piece", "cta_link": "/shop/lehengas",
                }),
            ],
            created_at=ago(20),
        ))

        session.add(CampaignRow(
            id=str(uuid.uuid4()), name="Diwali Dhamaka", slug="diwali-dhamaka", is_active=False, theme="default",
            countdown_target=NOW + timedelta(days=45), countdown_label="Diwali arrives in",
            sections=[
                _sec("hero", {
                    "eyebrow": "Diwali 2026", "title": "Light up the season. Festive wear, ready to shine.",
                    "subtitle": "Zari, sequins and rich colour -- for Lakshmi Puja evenings and every celebration after.",
                    "image": SUIT_IMG[4], "image_crop": None, "secondary_image": SUIT_IMG[1], "secondary_image_crop": None,
                    "cta_label": "Shop the Diwali Edit", "cta_anchor": "navratri-drop", "order_by_note": "Order by Nov 1 for guaranteed Diwali delivery",
                }),
                _sec("shloka", {"quote": "तमसो मा ज्योतिर्गमय", "translation": "Lead me from darkness to light."}),
                _sec("product_grid", {"heading": "New for Diwali", "subheading": "Fresh off the loom", "filter": {"is_new": True}, "empty_state_message": "New Diwali pieces landing soon."}),
                _sec("attribute_grid", {
                    "heading": "5 Days of Diwali", "subheading": "Each day, its own ritual.", "layout": "badges",
                    "items": [
                        {"order": 1, "title": "Dhanteras", "subtitle": "Nov 5", "description": "Buying gold and new beginnings.", "color": "#C9A227", "icon": None},
                        {"order": 2, "title": "Naraka Chaturdashi", "subtitle": "Nov 6", "description": "Choti Diwali -- the eve of the main day.", "color": "#D97B29", "icon": None},
                        {"order": 3, "title": "Lakshmi Puja", "subtitle": "Nov 7", "description": "The main day -- prayers for prosperity.", "color": "#8B1E2E", "icon": None},
                        {"order": 4, "title": "Govardhan Puja", "subtitle": "Nov 8", "description": "Gratitude for nature's abundance.", "color": "#0B6E4F", "icon": None},
                        {"order": 5, "title": "Bhai Dooj", "subtitle": "Nov 9", "description": "Celebrating the sibling bond.", "color": "#B76E79", "icon": None},
                    ],
                }),
                _sec("image_gallery", {"heading": "Festive Looks", "images": [
                    {"image": SUIT_IMG[2], "image_crop": None, "caption": "Rani pink for Lakshmi Puja"},
                    {"image": KURTI_IMG[5], "image_crop": None, "caption": "Maroon velvet for the evening aarti"},
                    {"image": LEHENGA_IMG[3], "image_crop": None, "caption": "Reception-ready for the after-party"},
                ]}),
                _sec("faq_accordion", {"heading": "Diwali shopping FAQs", "items": [
                    {"question": "Will my order arrive before Diwali?", "answer": "Orders placed by November 1st are guaranteed to arrive before Lakshmi Puja across most of India."},
                    {"question": "Do you offer gift wrapping?", "answer": "Yes -- add a note at checkout and we'll wrap it festively at no extra charge."},
                    {"question": "Can I exchange a gifted item?", "answer": "Yes, gifted items can be exchanged within 15 days of delivery -- see our Exchanges policy."},
                ]}),
                _sec("urgency_banner", {
                    "heading": "Order by November 1st for guaranteed Diwali delivery.", "subtext": "Festive edit · Limited stock",
                    "cta_label": "Shop now", "cta_link": "/shop/suits",
                }),
            ],
            created_at=ago(5),
        ))

        session.add(CampaignRow(
            id=str(uuid.uuid4()), name="Wedding Season Edit", slug="wedding-season", is_active=False, theme="default",
            countdown_target=None, countdown_label="",
            sections=[
                _sec("hero", {
                    "eyebrow": "Wedding Season · 2026", "title": "Trousseau pieces, worth the wait.",
                    "subtitle": "Zardozi, Banarasi silk and hand embroidery -- made to order for the big day and everything around it.",
                    "image": BRIDAL_IMG[0], "image_crop": None, "secondary_image": BRIDAL_IMG[2], "secondary_image_crop": None,
                    "cta_label": "Explore the Bridal Edit", "cta_anchor": "navratri-drop", "order_by_note": "",
                }),
                _sec("product_grid", {"heading": "Bridal Edit", "subheading": "Curated trousseau", "filter": {"category": "bridal-edit"}, "empty_state_message": "The Bridal Edit is being restocked -- check back soon."}),
                _sec("attribute_grid", {"heading": "What's Included", "subheading": "", "layout": "list", "items": [
                    {"order": 1, "title": "Custom fitting", "subtitle": "", "description": "Every bridal piece is fitted to your measurements at no extra cost.", "color": None, "icon": None},
                    {"order": 2, "title": "Protective dry-clean bag", "subtitle": "", "description": "Ships in a breathable garment bag to keep zari and embroidery pristine.", "color": None, "icon": None},
                    {"order": 3, "title": "15-day exchange window", "subtitle": "", "description": "Standard exchange policy applies even to made-to-order pieces.", "color": None, "icon": None},
                ]}),
                _sec("image_gallery", {"heading": "The Edit", "images": [
                    {"image": BRIDAL_IMG[1], "image_crop": None, "caption": "Champagne sequin reception wear"},
                    {"image": BRIDAL_IMG[3], "image_crop": None, "caption": "Deep red Banarasi silk"},
                    {"image": LEHENGA_IMG[5], "image_crop": None, "caption": "Rose gold for the sangeet"},
                ]}),
                _sec("faq_accordion", {"heading": "Bridal shopping FAQs", "items": [
                    {"question": "How long does custom stitching take?", "answer": "4-6 weeks from order confirmation -- book early for a specific wedding date."},
                    {"question": "Is Cash on Delivery available for high-value orders?", "answer": "COD is available up to ₹15,000; above that we require an online payment."},
                    {"question": "Can I request a different colourway?", "answer": "Yes -- WhatsApp us the piece and your preferred colour before ordering."},
                ]}),
                _sec("urgency_banner", {
                    "heading": "Book your fitting at least 6 weeks before the big day.", "subtext": "Made to order · Limited slots",
                    "cta_label": "Reserve your slot", "cta_link": "/contact",
                }),
            ],
            created_at=ago(3),
        ))

        session.add(CampaignRow(
            id=str(uuid.uuid4()), name="Republic Day Sale", slug="republic-day-sale", is_active=False, theme="default",
            countdown_target=NOW + timedelta(days=90), countdown_label="Sale ends in",
            sections=[
                _sec("hero", {
                    "eyebrow": "Republic Day Sale", "title": "26% off, for 26 hours.",
                    "subtitle": "One day only -- our bestsellers, discounted storewide.",
                    "image": KURTI_IMG[3], "image_crop": None, "secondary_image": "", "secondary_image_crop": None,
                    "cta_label": "Shop the Sale", "cta_anchor": "navratri-drop", "order_by_note": "",
                }),
                _sec("countdown", {"variant": "dark"}),
                _sec("product_grid", {"heading": "Bestsellers on Sale", "subheading": "While stock lasts", "filter": {"is_bestseller": True}, "empty_state_message": "Sale items are being added -- check back soon."}),
                _sec("rich_text", {
                    "heading": "Sale terms",
                    "body": "Discount applies automatically at checkout on all bestseller-tagged pieces.\n\nOffer valid for 26 hours from the countdown start and cannot be combined with other codes.\n\nExchanges remain available as usual within the standard 15-day window.",
                }),
            ],
            created_at=ago(1),
        ))

        session.add(CampaignRow(
            id=str(uuid.uuid4()), name="Summer Cotton Edit", slug="summer-cotton-edit", is_active=False, theme="default",
            countdown_target=None, countdown_label="",
            sections=[
                _sec("hero", {
                    "eyebrow": "Summer '26", "title": "Breathe easy. Pure cotton, cut for the heat.",
                    "subtitle": "Block-printed and chikankari kurtis in breathable cotton -- for the months that ask for less fabric, not less style.",
                    "image": KURTI_IMG[2], "image_crop": None, "secondary_image": KURTI_IMG[0], "secondary_image_crop": None,
                    "cta_label": "Shop Cotton Kurtis", "cta_anchor": "navratri-drop", "order_by_note": "",
                }),
                _sec("product_grid", {"heading": "Cotton Kurtis", "subheading": "Everyday to festive", "filter": {"category": "kurtis"}, "empty_state_message": "Restocking soon."}),
                _sec("faq_accordion", {"heading": "Cotton care FAQs", "items": [
                    {"question": "Will the colours run?", "answer": "Wash separately for the first 2-3 washes -- hand-block-printed cotton can release a little excess dye initially."},
                    {"question": "Is this fabric see-through?", "answer": "No, all our cotton kurtis use a mid-weight fabric with an inner lining where needed."},
                ]}),
                _sec("urgency_banner", {
                    "heading": "Free shipping on the Summer Cotton Edit, this week only.", "subtext": "Breathable · Everyday-ready",
                    "cta_label": "Shop now", "cta_link": "/shop/kurtis",
                }),
            ],
            created_at=ago(0),
        ))
        await session.commit()

        # --- site settings: update the singleton in place -------------------
        settings_row = await session.get(SiteSettingsRow, "site")
        if settings_row is None:
            settings_row = SiteSettingsRow(**SiteSettings().model_dump())
            session.add(settings_row)
        settings_row.home_hero = {
            "eyebrow": "Navratri Collection · 2026",
            "title_lines": ["Handcrafted", "for the days", "that matter."],
            "subtitle": "Lehengas, kurtis and suits stitched with intention -- for Garba nights, family functions and the quiet mornings before them. From our Surat studio to your doorstep.",
            "image": HERO_IMG[0], "image_crop": None,
        }
        settings_row.home_why = [
            {"icon": "HandHeart", "title": "Fabric-first", "copy": "Sourced from Surat mills we've known for years."},
            {"icon": "ShieldCheck", "title": "Fit Promise", "copy": "Honest sizing. Fit notes on every piece."},
            {"icon": "Truck", "title": "Pan-India Shipping", "copy": "COD available. 4-7 day delivery."},
            {"icon": "Sparkles", "title": "1,200+ Happy Homes", "copy": "From Surat to Bengaluru to Guwahati."},
        ]
        settings_row.instagram_tiles = [
            {"image": KURTI_IMG[2], "post_url": "https://www.instagram.com/p/C1a1B1cD1e1/"},
            {"image": SUIT_IMG[2], "post_url": "https://www.instagram.com/p/C2b2C2dE2f2/"},
            {"image": LEHENGA_IMG[2], "post_url": "https://www.instagram.com/p/C3c3D3eF3g3/"},
            {"image": DUPATTA_IMG[2], "post_url": "https://www.instagram.com/p/C4d4E4fG4h4/"},
            {"image": BRIDAL_IMG[2], "post_url": "https://www.instagram.com/p/C5e5F5gH5i5/"},
            {"image": HERO_IMG[1], "post_url": "https://www.instagram.com/p/C6f6G6hI6j6/"},
        ]
        settings_row.updated_at = ago(0, 1)
        await session.commit()

        # --- integrations: enable COD + Razorpay with fake test creds -------
        cod = await session.scalar(select(IntegrationRow).where(IntegrationRow.category == "payment", IntegrationRow.provider == "cod"))
        if cod:
            cod.is_enabled = True
            cod.updated_at = ago(0, 1)
        razorpay = await session.scalar(select(IntegrationRow).where(IntegrationRow.category == "payment", IntegrationRow.provider == "razorpay"))
        if razorpay:
            razorpay.is_enabled = True
            # Razorpay's own published sample test key id, plus an obviously-fake secret -- never a real credential.
            razorpay.credentials = {
                "key_id": encrypt("rzp_test_1DP5mmOlF5G5ag"),
                "key_secret": encrypt("fake_test_secret_do_not_use_ABCDEF123456"),
            }
            razorpay.updated_at = ago(0, 1)
        await session.commit()

        # --- subscribers + contact messages ----------------------------------
        for i, s in enumerate(SUBSCRIBERS):
            session.add(SubscriberRow(id=str(uuid.uuid4()), **s, created_at=ago(60 - i * 4)))
        for i, m in enumerate(CONTACT_MESSAGES):
            session.add(ContactMessageRow(id=str(uuid.uuid4()), **m, created_at=ago(30 - i * 2)))
        await session.commit()

    await database.close()

    print("Seed complete:")
    print(f"  categories: {len(CATEGORIES)}")
    print(f"  users: {len(CUSTOMERS)} customers + staff, pending signups: {len(PENDING_SIGNUPS)}")
    print(f"  products: {len(PRODUCTS)}")
    print(f"  orders: {len(ORDERS)}")
    print(f"  exchange requests: {len(EXCHANGE_REQUESTS)}")
    print(f"  carts: {len(CARTS)}")
    print("  campaigns: 5 (1 active -- Navratri 2026, 4 drafts showcasing other themes/layouts/section types)")
    print(f"  subscribers: {len(SUBSCRIBERS)}, contact messages: {len(CONTACT_MESSAGES)}")
    print(f"\nAll customer accounts use the password: {CUSTOMER_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
