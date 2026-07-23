import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


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
    # Set when the request carried a valid access token; null for guest checkout.
    user_id: Optional[str] = None
    status: str = "confirmed"  # confirmed | dispatched | delivered | cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderStatusUpdate(BaseModel):
    status: str


VALID_ORDER_STATUSES = {"confirmed", "dispatched", "delivered", "cancelled"}
