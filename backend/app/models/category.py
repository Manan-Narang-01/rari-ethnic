import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.image_crop import ImageCrop


class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    key: str  # slug used in Product.category and /shop/:category URLs, e.g. "kurtis"
    name: str
    description: str = ""
    image: Optional[str] = None
    image_crop: Optional[ImageCrop] = None
    sort_order: int = 0
    is_active: bool = True
    show_in_navbar: bool = True
    show_in_catalog: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CategoryCreate(BaseModel):
    key: Optional[str] = None  # auto-slugified from name if omitted
    name: str
    description: str = ""
    image: Optional[str] = None
    image_crop: Optional[ImageCrop] = None
    sort_order: int = 0
    is_active: bool = True
    show_in_navbar: bool = True
    show_in_catalog: bool = True


class CategoryUpdate(BaseModel):
    key: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    image_crop: Optional[ImageCrop] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    show_in_navbar: Optional[bool] = None
    show_in_catalog: Optional[bool] = None
