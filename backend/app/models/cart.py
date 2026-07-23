from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CartItem(BaseModel):
    # Same shape as OrderItem (app/models/order.py) and the localStorage item
    # shape in frontend/src/context/CartContext.jsx, deliberately -- no
    # translation layer needed anywhere this crosses.
    product_id: str
    slug: str
    name: str
    price: int
    quantity: int
    size: Optional[str] = None
    image: Optional[str] = None


class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")

    user_id: str  # one cart per customer -- this is the identity, not a separate id field
    items: List[CartItem] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CartReplace(BaseModel):
    items: List[CartItem]
