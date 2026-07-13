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
    subtotal: int
    shipping: int
    total: int
    payment_method: str = "COD"


class Order(OrderCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: "RE" + uuid.uuid4().hex[:8].upper())
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
async def create_order(payload: OrderCreate):
    order = Order(**payload.model_dump())
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
