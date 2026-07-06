from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Rari Ethnic API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class ProductImage(BaseModel):
    url: str
    alt: Optional[str] = None


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    name: str
    category: str  # suits | kurtis | lehengas
    price: int  # in INR (whole rupees)
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
    navratri_day: Optional[str] = None  # e.g. "Day 1 - Orange"
    edit_tag: Optional[str] = None  # "Garba Ready", "Family Function"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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
    status: str = "confirmed"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubscribeCreate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    source: str = "footer"


class Subscriber(SubscribeCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------- Seed data ----------
SEED_PRODUCTS = [
    # LEHENGAS
    {
        "slug": "amrapali-maroon-lehenga",
        "name": "Amrapali Maroon Zardozi Lehenga",
        "category": "lehengas",
        "price": 4499,
        "compare_at_price": 5200,
        "description": "A regal maroon lehenga with delicate zardozi hand-embroidery on the border. Cut for movement — twirls beautifully on the dance floor without weighing you down.",
        "fabric": "Silk blend with cotton lining. Dupatta in soft net.",
        "care": "Dry clean only. Store folded with muslin cloth. Avoid direct sunlight.",
        "fit_notes": "True to size. Blouse has 4 inch margin on sides for alterations.",
        "occasion": ["Wedding", "Sangeet", "Reception"],
        "sizes": ["XS", "S", "M", "L", "XL"],
        "colors": ["Maroon"],
        "color_hex": ["#7E1F35"],
        "images": [
            "https://images.unsplash.com/photo-1654764746225-e63f5e90facd?w=1200",
            "https://images.unsplash.com/photo-1677691257363-eebd2abeafec?w=1200",
            "https://images.unsplash.com/photo-1668371459824-094a960a227d?w=1200",
        ],
        "stock": 3,
        "is_bestseller": True,
        "is_navratri": True,
        "edit_tag": "Family Function",
    },
    {
        "slug": "chandani-ivory-mirror-lehenga",
        "name": "Chandani Ivory Mirror-Work Lehenga",
        "category": "lehengas",
        "price": 3899,
        "description": "Ivory base with tiny mirror-work scattered like stars. The soft palette makes the mirrors sparkle without shouting. A quiet showstopper.",
        "fabric": "Cotton silk with mirror & thread embroidery. Chiffon dupatta.",
        "care": "Dry clean recommended. Iron on reverse.",
        "fit_notes": "Runs true to size. Elastic waist has 3 inch stretch.",
        "occasion": ["Garba", "Navratri", "Mehendi"],
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Ivory"],
        "color_hex": ["#F3EDE4"],
        "images": [
            "https://images.unsplash.com/photo-1503160865267-af4660ce7bf2?w=1200",
            "https://images.unsplash.com/photo-1610030006432-9daf1a8b4dcd?w=1200",
        ],
        "stock": 6,
        "is_bestseller": True,
        "is_navratri": True,
        "navratri_day": "Day 5 - White",
        "edit_tag": "Garba Ready",
    },
    {
        "slug": "phulwari-mustard-lehenga",
        "name": "Phulwari Mustard Gota Lehenga",
        "category": "lehengas",
        "price": 3299,
        "description": "Warm mustard with fine gota-patti border in a floral vine pattern. Feels like Rajasthan afternoons — bright, honest, unforgettable.",
        "fabric": "Cotton silk. Gota-patti embroidery. Net dupatta.",
        "care": "Dry clean. Store in dust cover.",
        "fit_notes": "Slightly loose at the waist — order one size down if between sizes.",
        "occasion": ["Haldi", "Navratri", "Day event"],
        "sizes": ["XS", "S", "M", "L"],
        "colors": ["Mustard"],
        "color_hex": ["#DCA537"],
        "images": [
            "https://images.unsplash.com/photo-1610030181087-540017dc9d61?w=1200",
            "https://images.unsplash.com/photo-1610030006432-9daf1a8b4dcd?w=1200",
        ],
        "stock": 4,
        "is_new": True,
        "is_navratri": True,
        "navratri_day": "Day 2 - Yellow",
        "edit_tag": "Garba Ready",
    },
    {
        "slug": "rangeela-teal-lehenga",
        "name": "Rangeela Teal Bandhani Lehenga",
        "category": "lehengas",
        "price": 2899,
        "description": "Deep teal bandhani lehenga tied by Kutch artisans. Every dot is hand-knotted. A piece of Gujarat you wear.",
        "fabric": "Pure cotton bandhani. Handloom.",
        "care": "First wash separately in cold water. Do not bleach.",
        "fit_notes": "True to size. Two adjustable dori knots at waist.",
        "occasion": ["Navratri", "Garba", "Festival"],
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": ["Teal"],
        "color_hex": ["#185D64"],
        "images": [
            "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200",
        ],
        "stock": 2,
        "is_navratri": True,
        "navratri_day": "Day 4 - Green",
        "edit_tag": "Garba Ready",
    },
    # KURTIS
    {
        "slug": "meher-maroon-kurti",
        "name": "Meher Maroon Chikankari Kurti",
        "category": "kurtis",
        "price": 1599,
        "compare_at_price": 1899,
        "description": "Deep maroon kurti with fine chikankari from Lucknow. Long enough for confidence, breathable enough for a long day.",
        "fabric": "Cotton lawn. Hand chikankari embroidery.",
        "care": "Hand wash in cold water. Line dry in shade.",
        "fit_notes": "True to size. Length 44 inches for M.",
        "occasion": ["Daily", "Office", "Festive lunch"],
        "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
        "colors": ["Maroon"],
        "color_hex": ["#7E1F35"],
        "images": [
            "https://images.unsplash.com/photo-1708534246055-d7b149acb731?w=1200",
            "https://images.unsplash.com/photo-1708534246051-7f47b279e94b?w=1200",
        ],
        "stock": 12,
        "is_bestseller": True,
    },
    {
        "slug": "gulnaar-magenta-kurti",
        "name": "Gulnaar Magenta Anarkali Kurti",
        "category": "kurtis",
        "price": 2199,
        "description": "A flared magenta anarkali with gota lace at the yoke. The kind of kurti that turns a regular Tuesday into an occasion.",
        "fabric": "Rayon with cotton lining. Gota lace detail.",
        "care": "Machine wash gentle. Iron medium heat.",
        "fit_notes": "Slightly flared. Runs true to size.",
        "occasion": ["Festive", "Party", "Sangeet"],
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Magenta"],
        "color_hex": ["#98285D"],
        "images": [
            "https://images.unsplash.com/photo-1708534246051-7f47b279e94b?w=1200",
            "https://images.unsplash.com/photo-1708534246055-d7b149acb731?w=1200",
        ],
        "stock": 8,
        "is_bestseller": True,
        "is_new": True,
    },
    {
        "slug": "neel-blue-block-print-kurti",
        "name": "Neel Indigo Block Print Kurti",
        "category": "kurtis",
        "price": 1299,
        "description": "Hand block printed in Sanganer. The indigo deepens with every wash — a kurti that grows with you.",
        "fabric": "Pure cotton. Natural indigo dye.",
        "care": "First wash with rock salt in cold water. Colour may bleed initially — that's the mark of natural dye.",
        "fit_notes": "True to size. A-line silhouette.",
        "occasion": ["Daily", "Casual", "Office"],
        "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
        "colors": ["Indigo"],
        "color_hex": ["#1E3A5F"],
        "images": [
            "https://images.pexels.com/photos/13178920/pexels-photo-13178920.jpeg?w=1200",
        ],
        "stock": 15,
        "is_new": True,
    },
    {
        "slug": "kesari-mustard-embroidered-kurti",
        "name": "Kesari Mustard Embroidered Kurti",
        "category": "kurtis",
        "price": 1799,
        "description": "Sunny mustard with resham thread embroidery in floral motifs. Bright enough for photos, comfortable enough for the whole function.",
        "fabric": "Cotton silk. Resham thread work.",
        "care": "Dry clean or hand wash cold.",
        "fit_notes": "True to size. Straight cut.",
        "occasion": ["Haldi", "Day event", "Festive"],
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Mustard"],
        "color_hex": ["#DCA537"],
        "images": [
            "https://images.unsplash.com/photo-1764740146693-4955d02c98f9?w=1200",
        ],
        "stock": 7,
        "is_navratri": True,
        "navratri_day": "Day 2 - Yellow",
        "edit_tag": "Garba Ready",
    },
    # SUITS
    {
        "slug": "saanjh-teal-suit",
        "name": "Saanjh Teal Palazzo Suit",
        "category": "suits",
        "price": 2499,
        "description": "Three-piece teal suit with palazzo pants and a chiffon dupatta. Effortless for family gatherings — feels dressed up without trying.",
        "fabric": "Cotton silk kurta. Cotton palazzo. Chiffon dupatta.",
        "care": "Dry clean recommended. Iron dupatta on low.",
        "fit_notes": "Kurta runs true to size. Palazzo has drawstring waist.",
        "occasion": ["Family function", "Festive", "Office festive"],
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": ["Teal"],
        "color_hex": ["#185D64"],
        "images": [
            "https://images.unsplash.com/photo-1764740146693-4955d02c98f9?w=1200",
        ],
        "stock": 6,
        "is_bestseller": True,
    },
    {
        "slug": "raabta-ivory-suit",
        "name": "Raabta Ivory Sharara Suit",
        "category": "suits",
        "price": 3499,
        "description": "Ivory kurta with silver zari on the yoke, paired with flared sharara. Understated luxury — the piece your family will remember years later.",
        "fabric": "Georgette kurta with zari. Georgette sharara. Net dupatta with sequin border.",
        "care": "Dry clean only.",
        "fit_notes": "Kurta length 38 inches. Sharara true to size.",
        "occasion": ["Nikah", "Reception", "Sangeet"],
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Ivory"],
        "color_hex": ["#F3EDE4"],
        "images": [
            "https://images.unsplash.com/photo-1677691257363-eebd2abeafec?w=1200",
        ],
        "stock": 4,
        "is_new": True,
    },
    {
        "slug": "mehr-magenta-suit",
        "name": "Mehr Magenta Straight Suit",
        "category": "suits",
        "price": 2199,
        "description": "A magenta straight-cut suit with contrast mustard piping and dupatta. Warm colour combination rooted in old-school Surat sensibility.",
        "fabric": "Cotton silk. Contrast piping detail.",
        "care": "Hand wash cold. Iron medium heat.",
        "fit_notes": "Straight cut. Runs slightly loose — order one size down if between sizes.",
        "occasion": ["Festive", "Family lunch", "Diwali"],
        "sizes": ["XS", "S", "M", "L", "XL"],
        "colors": ["Magenta"],
        "color_hex": ["#98285D"],
        "images": [
            "https://images.unsplash.com/photo-1708534246051-7f47b279e94b?w=1200",
        ],
        "stock": 9,
        "is_bestseller": True,
    },
    {
        "slug": "noor-maroon-anarkali-suit",
        "name": "Noor Maroon Anarkali Suit",
        "category": "suits",
        "price": 3899,
        "description": "A floor-grazing maroon anarkali with gold zari all-over. Cut with a fitted bodice and a full flare — designed to move like a memory.",
        "fabric": "Silk blend with zari. Silk lining. Net dupatta.",
        "care": "Dry clean only.",
        "fit_notes": "Fitted bust and waist. Length 52 inches.",
        "occasion": ["Wedding", "Reception", "Diwali"],
        "sizes": ["S", "M", "L", "XL"],
        "colors": ["Maroon"],
        "color_hex": ["#7E1F35"],
        "images": [
            "https://images.unsplash.com/photo-1654764746225-e63f5e90facd?w=1200",
        ],
        "stock": 3,
        "is_navratri": True,
        "navratri_day": "Day 6 - Red",
        "edit_tag": "Family Function",
    },
]


# ---------- Routes ----------
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
    query = {}
    if category:
        query["category"] = category
    if is_bestseller is not None:
        query["is_bestseller"] = is_bestseller
    if is_navratri is not None:
        query["is_navratri"] = is_navratri
    if is_new is not None:
        query["is_new"] = is_new
    docs = await db.products.find(query, {"_id": 0}).to_list(500)
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
    # serialize nested items to plain dicts
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
async def create_contact(payload: dict):
    msg = ContactMessage(**payload)
    doc = msg.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.contact_messages.insert_one(doc)
    return msg


# ---------- Startup: seed if empty ----------
@app.on_event("startup")
async def seed_products():
    try:
        count = await db.products.count_documents({})
        if count == 0:
            docs = []
            for p in SEED_PRODUCTS:
                product = Product(**p)
                d = product.model_dump()
                d["created_at"] = d["created_at"].isoformat()
                docs.append(d)
            await db.products.insert_many(docs)
            logging.info(f"Seeded {len(docs)} products")
    except Exception as e:
        logging.error(f"Seed error: {e}")


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
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
