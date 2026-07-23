from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import Response
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from admin_lib import (
    hash_password,
    verify_password,
    create_access_token,
    require_admin,
    require_customer,
    verify_google_token,
    init_storage,
    put_object,
    get_object,
    guess_content_type,
)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
APP_NAME = os.environ.get("APP_NAME", "rariethnic")

app = FastAPI(title="Rari Ethnic API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    name: str
    category: str  # suits | kurtis | lehengas
    price: int
    compare_at_price: Optional[int] = None
    description: str
    fabric: str
    care: str
    fit_notes: str
    occasion: List[str] = []
    sizes: List[str] = []
    colors: List[str] = []
    color_hex: List[str] = []
    images: List[str] = []
    stock: int = 5
    is_bestseller: bool = False
    is_new: bool = False
    is_navratri: bool = False
    is_active: bool = True
    navratri_day: Optional[str] = None
    edit_tag: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCreate(BaseModel):
    slug: Optional[str] = None
    name: str
    category: str
    price: int
    compare_at_price: Optional[int] = None
    description: str = ""
    fabric: str = ""
    care: str = ""
    fit_notes: str = ""
    occasion: List[str] = []
    sizes: List[str] = []
    colors: List[str] = []
    color_hex: List[str] = []
    images: List[str] = []
    stock: int = 5
    is_bestseller: bool = False
    is_new: bool = False
    is_navratri: bool = False
    is_active: bool = True
    navratri_day: Optional[str] = None
    edit_tag: Optional[str] = None


class ProductUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = None
    compare_at_price: Optional[int] = None
    description: Optional[str] = None
    fabric: Optional[str] = None
    care: Optional[str] = None
    fit_notes: Optional[str] = None
    occasion: Optional[List[str]] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    color_hex: Optional[List[str]] = None
    images: Optional[List[str]] = None
    stock: Optional[int] = None
    is_bestseller: Optional[bool] = None
    is_new: Optional[bool] = None
    is_navratri: Optional[bool] = None
    is_active: Optional[bool] = None
    navratri_day: Optional[str] = None
    edit_tag: Optional[str] = None


class OrderItem(BaseModel):
    product_id: str
    slug: str
    name: str
    price: int
    quantity: int
    size: Optional[str] = None
    image: Optional[str] = None


class OrderCreate(BaseModel):
    customer_name: str
    email: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    notes: Optional[str] = None
    items: List[OrderItem]
    payment_method: str = "COD"


class Order(OrderCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: "RE" + uuid.uuid4().hex[:8].upper())
    customer_id: Optional[str] = None
    subtotal: int = 0
    shipping: int = 0
    total: int = 0
    status: str = "confirmed"  # confirmed | dispatched | delivered | cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderStatusUpdate(BaseModel):
    status: str


class SubscribeCreate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    source: str = "footer"


class Subscriber(SubscribeCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContactCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: str


class ContactMessage(ContactCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LoginPayload(BaseModel):
    email: str
    password: str


class GoogleAuthPayload(BaseModel):
    credential: str  # Google Identity Services ID token


class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str = ""
    picture: Optional[str] = None
    google_sub: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------- Site settings (admin-controlled global content) ----------
class HomeHero(BaseModel):
    eyebrow: str = "Navratri Collection · 2026"
    title_lines: List[str] = ["Handcrafted", "for the days", "that matter."]
    subtitle: str = (
        "Lehengas, kurtis and suits stitched with intention — for Garba nights, "
        "family functions and the quiet mornings before them. From our Surat studio to your doorstep."
    )
    image: str = "https://images.unsplash.com/photo-1654764746225-e63f5e90facd?w=2000"


class HomeCategory(BaseModel):
    key: str
    name: str
    tag: str = ""
    image: str = ""
    color: str = "#A0684E"


class HomeWhy(BaseModel):
    icon: str = "Sparkles"
    title: str
    copy: str = ""


class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "site"
    announcements: List[str] = [
        "Handcrafted in Surat",
        "Free shipping over ₹2,000",
        "Pan-India delivery in 4-7 days",
        "Cash on Delivery available",
    ]
    free_shipping_threshold: int = 2000
    shipping_fee: int = 99
    whatsapp_number: str = "919316565117"
    instagram_url: str = "https://www.instagram.com/rari.ethnic"
    home_hero: HomeHero = Field(default_factory=HomeHero)
    home_categories: List[HomeCategory] = Field(default_factory=lambda: [
        HomeCategory(key="kurtis", name="Kurtis", tag="Everyday to festive",
                     image="https://images.unsplash.com/photo-1708534246055-d7b149acb731?w=1200", color="#A0684E"),
        HomeCategory(key="suits", name="Suits", tag="Palazzo, Sharara & more",
                     image="https://images.unsplash.com/photo-1764740146693-4955d02c98f9?w=1200", color="#7B6E5A"),
        HomeCategory(key="lehengas", name="Lehengas", tag="For the big days",
                     image="https://images.unsplash.com/photo-1503160865267-af4660ce7bf2?w=1200", color="#A05B6A"),
    ])
    home_why: List[HomeWhy] = Field(default_factory=lambda: [
        HomeWhy(icon="HandHeart", title="Fabric-first", copy="Sourced from Surat mills we've known for years."),
        HomeWhy(icon="ShieldCheck", title="Fit Promise", copy="Honest sizing. Fit notes on every piece."),
        HomeWhy(icon="Truck", title="Pan-India Shipping", copy="COD available. 4-7 day delivery."),
        HomeWhy(icon="Sparkles", title="1,200+ Happy Homes", copy="From Surat to Bengaluru to Guwahati."),
    ])
    instagram_tiles: List[str] = Field(default_factory=lambda: [
        "https://images.unsplash.com/photo-1503160865267-af4660ce7bf2?w=600",
        "https://images.unsplash.com/photo-1708534246055-d7b149acb731?w=600",
        "https://images.pexels.com/photos/13178920/pexels-photo-13178920.jpeg?w=600",
        "https://images.unsplash.com/photo-1764740146693-4955d02c98f9?w=600",
    ])


class SettingsUpdate(BaseModel):
    announcements: Optional[List[str]] = None
    free_shipping_threshold: Optional[int] = None
    shipping_fee: Optional[int] = None
    whatsapp_number: Optional[str] = None
    instagram_url: Optional[str] = None
    home_hero: Optional[HomeHero] = None
    home_categories: Optional[List[HomeCategory]] = None
    home_why: Optional[List[HomeWhy]] = None
    instagram_tiles: Optional[List[str]] = None


# ---------- Campaigns / events (Navratri, Diwali, wedding season …) ----------
class DayColor(BaseModel):
    day: int
    name: str
    hex: str
    meaning: str = ""


class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str = "navratri"
    is_active: bool = False
    theme: str = "festive"  # festive | default
    countdown_target: Optional[str] = None  # ISO date string
    countdown_label: str = "Navratri arrives in"
    hero_eyebrow: str = ""
    hero_title: str = ""
    hero_subtitle: str = ""
    hero_image: Optional[str] = None
    hero_secondary_image: Optional[str] = None
    cta_label: str = "Shop the drop"
    order_by_note: str = ""
    shloka: str = ""
    shloka_translation: str = ""
    day_colors: List[DayColor] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CampaignCreate(BaseModel):
    name: str
    slug: str = "navratri"
    is_active: bool = False
    theme: str = "festive"
    countdown_target: Optional[str] = None
    countdown_label: str = "Navratri arrives in"
    hero_eyebrow: str = ""
    hero_title: str = ""
    hero_subtitle: str = ""
    hero_image: Optional[str] = None
    hero_secondary_image: Optional[str] = None
    cta_label: str = "Shop the drop"
    order_by_note: str = ""
    shloka: str = ""
    shloka_translation: str = ""
    day_colors: List[DayColor] = []


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    is_active: Optional[bool] = None
    theme: Optional[str] = None
    countdown_target: Optional[str] = None
    countdown_label: Optional[str] = None
    hero_eyebrow: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_image: Optional[str] = None
    hero_secondary_image: Optional[str] = None
    cta_label: Optional[str] = None
    order_by_note: Optional[str] = None
    shloka: Optional[str] = None
    shloka_translation: Optional[str] = None
    day_colors: Optional[List[DayColor]] = None


# ---------- Helpers ----------
def slugify(name: str) -> str:
    import re
    s = name.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s


# ---------- Public routes ----------
@api_router.get("/")
async def root():
    return {"message": "Rari Ethnic API"}


@api_router.get("/products", response_model=List[Product])
async def list_products(
    category: Optional[str] = None,
    is_bestseller: Optional[bool] = None,
    is_navratri: Optional[bool] = None,
    is_new: Optional[bool] = None,
):
    query = {"is_active": {"$ne": False}}
    if category:
        query["category"] = category
    if is_bestseller is not None:
        query["is_bestseller"] = is_bestseller
    if is_navratri is not None:
        query["is_navratri"] = is_navratri
    if is_new is not None:
        query["is_new"] = is_new
    docs = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


@api_router.get("/products/{slug}", response_model=Product)
async def get_product(slug: str):
    doc = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api_router.post("/orders", response_model=Order)
async def create_order(payload: OrderCreate, customer=Depends(require_customer)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    settings = await get_settings_doc()
    threshold = settings.get("free_shipping_threshold", 2000)
    fee = settings.get("shipping_fee", 99)

    # Recompute prices server-side from the DB — never trust client totals.
    priced_items = []
    subtotal = 0
    for item in payload.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product or product.get("is_active") is False:
            raise HTTPException(status_code=400, detail=f"Product unavailable: {item.name}")
        qty = max(1, int(item.quantity))
        price = int(product["price"])
        subtotal += price * qty
        priced_items.append({
            "product_id": product["id"],
            "slug": product["slug"],
            "name": product["name"],
            "price": price,
            "quantity": qty,
            "size": item.size,
            "image": product.get("images", [None])[0] if product.get("images") else item.image,
        })

    shipping = 0 if subtotal == 0 or subtotal >= threshold else fee
    total = subtotal + shipping

    order = Order(
        **payload.model_dump(exclude={"items"}),
        items=priced_items,
        customer_id=customer.get("cid"),
        subtotal=subtotal,
        shipping=shipping,
        total=total,
    )
    doc = order.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["items"] = [i if isinstance(i, dict) else i.model_dump() for i in doc["items"]]
    await db.orders.insert_one(doc)
    return order


@api_router.get("/orders/{order_number}", response_model=Order)
async def get_order(order_number: str):
    doc = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api_router.post("/subscribe", response_model=Subscriber)
async def subscribe(payload: SubscribeCreate):
    if not payload.email and not payload.phone:
        raise HTTPException(status_code=400, detail="Provide email or phone")
    sub = Subscriber(**payload.model_dump())
    doc = sub.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.subscribers.insert_one(doc)
    return sub


@api_router.post("/contact", response_model=ContactMessage)
async def create_contact(payload: ContactCreate):
    msg = ContactMessage(**payload.model_dump())
    doc = msg.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.contact_messages.insert_one(doc)
    return msg


# Public file server (product images are public)
@api_router.get("/files/{path:path}")
async def download_file(path: str):
    try:
        data, ct = get_object(path)
        return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=31536000"})
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {e}")


# ---------- Auth ----------
@api_router.post("/auth/login")
async def login(payload: LoginPayload):
    admin_email = os.environ["ADMIN_EMAIL"].strip().lower()
    email = payload.email.strip().lower()
    if email != admin_email:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    admin = await db.users.find_one({"email": admin_email})
    if not admin or not verify_password(payload.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(admin_email)
    return {"access_token": token, "token_type": "bearer", "email": admin_email, "role": "admin"}


@api_router.get("/auth/me")
async def me(user=Depends(require_admin)):
    return {"email": user.get("email"), "role": user.get("role")}


# ---------- Customer auth (Google Sign-In) ----------
@api_router.post("/customer/google")
async def customer_google_login(payload: GoogleAuthPayload):
    claims = verify_google_token(payload.credential)
    email = claims.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Google account has no email")

    existing = await db.customers.find_one({"email": email})
    if existing:
        customer = Customer(**existing)
        await db.customers.update_one(
            {"id": customer.id},
            {"$set": {
                "name": claims.get("name", customer.name),
                "picture": claims.get("picture", customer.picture),
                "google_sub": claims.get("sub", customer.google_sub),
            }},
        )
    else:
        customer = Customer(
            email=email,
            name=claims.get("name", ""),
            picture=claims.get("picture"),
            google_sub=claims.get("sub"),
        )
        doc = customer.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.customers.insert_one(doc)

    token = create_access_token(
        email,
        role="customer",
        extra={"cid": customer.id, "name": customer.name, "picture": customer.picture},
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "customer": {
            "id": customer.id,
            "email": customer.email,
            "name": customer.name,
            "picture": customer.picture,
        },
    }


class DevLoginPayload(BaseModel):
    email: str
    name: Optional[str] = None


def _dev_login_allowed() -> bool:
    # Enabled explicitly, or automatically when Google is not yet configured
    # (so the site can be tested end-to-end before OAuth is set up).
    if os.environ.get("ALLOW_DEV_LOGIN", "").strip().lower() == "true":
        return True
    return not os.environ.get("GOOGLE_CLIENT_ID", "").strip()


@api_router.get("/customer/auth-config")
async def customer_auth_config():
    return {
        "google_enabled": bool(os.environ.get("GOOGLE_CLIENT_ID", "").strip()),
        "dev_login_enabled": _dev_login_allowed(),
    }


@api_router.post("/customer/dev-login")
async def customer_dev_login(payload: DevLoginPayload):
    """Passwordless test login. Only available when Google is not configured."""
    if not _dev_login_allowed():
        raise HTTPException(status_code=403, detail="Dev login is disabled")
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email")

    existing = await db.customers.find_one({"email": email})
    if existing:
        customer = Customer(**existing)
    else:
        customer = Customer(email=email, name=payload.name or email.split("@")[0])
        doc = customer.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.customers.insert_one(doc)

    logging.warning(f"DEV LOGIN used for {email} (no Google OAuth configured)")
    token = create_access_token(
        email,
        role="customer",
        extra={"cid": customer.id, "name": customer.name, "picture": customer.picture},
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "customer": {
            "id": customer.id,
            "email": customer.email,
            "name": customer.name,
            "picture": customer.picture,
        },
    }


@api_router.get("/customer/me")
async def customer_me(customer=Depends(require_customer)):
    doc = await db.customers.find_one({"id": customer.get("cid")}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc.get("name", ""),
        "picture": doc.get("picture"),
    }


@api_router.get("/customer/orders", response_model=List[Order])
async def customer_orders(customer=Depends(require_customer)):
    docs = await db.orders.find(
        {"customer_id": customer.get("cid")}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


# ---------- Public: Settings & Campaigns ----------
async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"id": "site"}, {"_id": 0})
    if not doc:
        doc = Settings().model_dump()
        await db.settings.insert_one(Settings().model_dump())
    return doc


@api_router.get("/settings", response_model=Settings)
async def public_settings():
    return await get_settings_doc()


@api_router.get("/campaigns/active")
async def active_campaign():
    doc = await db.campaigns.find_one({"is_active": True}, {"_id": 0})
    if not doc:
        return None
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return Campaign(**doc)


# ---------- Admin: Products ----------
@api_router.post("/admin/products", response_model=Product)
async def admin_create_product(payload: ProductCreate, user=Depends(require_admin)):
    data = payload.model_dump()
    if not data.get("slug"):
        base = slugify(data["name"])
        slug = base
        i = 1
        while await db.products.find_one({"slug": slug}):
            i += 1
            slug = f"{base}-{i}"
        data["slug"] = slug
    else:
        if await db.products.find_one({"slug": data["slug"]}):
            raise HTTPException(status_code=409, detail="Slug already exists")
    product = Product(**data)
    doc = product.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
    return product


@api_router.put("/admin/products/{product_id}", response_model=Product)
async def admin_update_product(product_id: str, payload: ProductUpdate, user=Depends(require_admin)):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "slug" in updates:
        existing = await db.products.find_one({"slug": updates["slug"], "id": {"$ne": product_id}})
        if existing:
            raise HTTPException(status_code=409, detail="Slug already exists")
    r = await db.products.update_one({"id": product_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, user=Depends(require_admin)):
    r = await db.products.delete_one({"id": product_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": True}


@api_router.get("/admin/products", response_model=List[Product])
async def admin_list_products(user=Depends(require_admin)):
    docs = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


# ---------- Admin: Orders ----------
@api_router.get("/admin/orders", response_model=List[Order])
async def admin_list_orders(user=Depends(require_admin)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


@api_router.patch("/admin/orders/{order_number}")
async def admin_update_order(order_number: str, payload: OrderStatusUpdate, user=Depends(require_admin)):
    valid = {"confirmed", "dispatched", "delivered", "cancelled"}
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    r = await db.orders.update_one({"order_number": order_number}, {"$set": {"status": payload.status}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"updated": True, "status": payload.status}


# ---------- Admin: Subscribers ----------
@api_router.get("/admin/subscribers")
async def admin_list_subscribers(user=Depends(require_admin)):
    docs = await db.subscribers.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.get("/admin/contact-messages")
async def admin_list_contact(user=Depends(require_admin)):
    docs = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


# ---------- Admin: Settings ----------
@api_router.get("/admin/settings", response_model=Settings)
async def admin_get_settings(user=Depends(require_admin)):
    return await get_settings_doc()


@api_router.put("/admin/settings", response_model=Settings)
async def admin_update_settings(payload: SettingsUpdate, user=Depends(require_admin)):
    await get_settings_doc()  # ensure a doc exists
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if updates:
        await db.settings.update_one({"id": "site"}, {"$set": updates})
    doc = await db.settings.find_one({"id": "site"}, {"_id": 0})
    return doc


# ---------- Admin: Campaigns ----------
@api_router.get("/admin/campaigns", response_model=List[Campaign])
async def admin_list_campaigns(user=Depends(require_admin)):
    docs = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


@api_router.post("/admin/campaigns", response_model=Campaign)
async def admin_create_campaign(payload: CampaignCreate, user=Depends(require_admin)):
    campaign = Campaign(**payload.model_dump())
    if campaign.is_active:
        await db.campaigns.update_many({}, {"$set": {"is_active": False}})
    doc = campaign.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.campaigns.insert_one(doc)
    return campaign


@api_router.put("/admin/campaigns/{campaign_id}", response_model=Campaign)
async def admin_update_campaign(campaign_id: str, payload: CampaignUpdate, user=Depends(require_admin)):
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("is_active"):
        await db.campaigns.update_many({"id": {"$ne": campaign_id}}, {"$set": {"is_active": False}})
    r = await db.campaigns.update_one({"id": campaign_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    doc = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api_router.delete("/admin/campaigns/{campaign_id}")
async def admin_delete_campaign(campaign_id: str, user=Depends(require_admin)):
    r = await db.campaigns.delete_one({"id": campaign_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"deleted": True}


# ---------- Admin: Upload ----------
@api_router.post("/admin/upload")
async def admin_upload(file: UploadFile = File(...), user=Depends(require_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(status_code=400, detail="Only image files allowed")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
    path = f"{APP_NAME}/products/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or guess_content_type(file.filename, "image/jpeg")
    try:
        result = put_object(path, data, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
    # Return a URL that points to our own /api/files/{path} endpoint (public)
    backend = os.environ.get("BACKEND_PUBLIC_URL", "")
    stored_path = result["path"]
    return {
        "path": stored_path,
        "url": f"/api/files/{stored_path}",
        "size": result.get("size"),
    }


# ---------- Startup: seed products + admin ----------
@app.on_event("startup")
async def startup_tasks():
    # Try init storage (non-fatal)
    try:
        init_storage()
    except Exception as e:
        logging.warning(f"Storage init failed at startup (will retry on demand): {e}")

    # Seed admin
    try:
        admin_email = os.environ["ADMIN_EMAIL"].strip().lower()
        admin_password = os.environ["ADMIN_PASSWORD"]
        existing = await db.users.find_one({"email": admin_email})
        if existing is None:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logging.info(f"Seeded admin user: {admin_email}")
        elif not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password)}}
            )
            logging.info("Updated admin password hash from .env")
    except Exception as e:
        logging.error(f"Admin seed failed: {e}")

    # Ensure existing products have is_active flag
    try:
        await db.products.update_many({"is_active": {"$exists": False}}, {"$set": {"is_active": True}})
    except Exception as e:
        logging.error(f"Product backfill failed: {e}")

    # Seed default site settings
    try:
        if await db.settings.find_one({"id": "site"}) is None:
            await db.settings.insert_one(Settings().model_dump())
            logging.info("Seeded default site settings")
    except Exception as e:
        logging.error(f"Settings seed failed: {e}")

    # Seed a default Navratri campaign (mirrors the previously hardcoded content)
    try:
        if await db.campaigns.count_documents({}) == 0:
            navratri = Campaign(
                name="Navratri 2026",
                slug="navratri",
                is_active=True,
                theme="festive",
                countdown_target="2026-10-12T00:00:00+05:30",
                countdown_label="Navratri arrives in",
                hero_eyebrow="Navratri Edit · 2026",
                hero_title="Jai Mata Di. Nine nights. One goddess in you.",
                hero_subtitle=(
                    "Lehengas, kurtis and suits handpicked for Garba nights, aarti mornings "
                    "and every colour Maa asks you to wear. Handcrafted in Surat."
                ),
                hero_image="https://images.pexels.com/photos/28936373/pexels-photo-28936373.jpeg?auto=compress&cs=tinysrgb&w=1600",
                hero_secondary_image="https://images.pexels.com/photos/29593203/pexels-photo-29593203.jpeg?auto=compress&cs=tinysrgb&w=1200",
                cta_label="Shop the drop",
                order_by_note="Order by Sep 20 for pre-Navratri delivery",
                shloka="या देवी सर्वभूतेषु शक्तिरूपेण संस्थिता",
                shloka_translation="To the goddess who dwells in every being as strength",
                day_colors=[
                    DayColor(day=1, name="Orange", hex="#E27D2C", meaning="Energy & vitality"),
                    DayColor(day=2, name="White", hex="#F3EDE4", meaning="Peace & purity"),
                    DayColor(day=3, name="Red", hex="#7E1F35", meaning="Passion & power"),
                    DayColor(day=4, name="Royal Blue", hex="#1E3A5F", meaning="Wisdom & calm"),
                    DayColor(day=5, name="Yellow", hex="#DCA537", meaning="Joy & brightness"),
                    DayColor(day=6, name="Green", hex="#185D64", meaning="Growth & fertility"),
                    DayColor(day=7, name="Grey", hex="#8A8078", meaning="Balance & strength"),
                    DayColor(day=8, name="Purple", hex="#98285D", meaning="Ambition & pride"),
                    DayColor(day=9, name="Peacock Green", hex="#0F6E5E", meaning="Uniqueness"),
                ],
            )
            doc = navratri.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.campaigns.insert_one(doc)
            logging.info("Seeded default Navratri campaign")
    except Exception as e:
        logging.error(f"Campaign seed failed: {e}")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
