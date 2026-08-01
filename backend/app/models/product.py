import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    name: str
    categories: List[str]  # keys into the Category taxonomy, e.g. ["kurtis", "navratri"]
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
    # When enabled, this product's shipping_charge replaces the site-wide
    # free-shipping-threshold rule for any order containing it (see
    # OrderService.create) instead of stacking with it.
    shipping_enabled: bool = False
    shipping_charge: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCreate(BaseModel):
    slug: Optional[str] = None
    name: str
    categories: List[str]
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
    shipping_enabled: bool = False
    shipping_charge: int = 0


class ProductUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    categories: Optional[List[str]] = None
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
    shipping_enabled: Optional[bool] = None
    shipping_charge: Optional[int] = None
