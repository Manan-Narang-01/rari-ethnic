from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.image_crop import ImageCrop

DEFAULT_ANNOUNCEMENTS = [
    "Handcrafted in Surat",
    "Free shipping",
    "Pan-India delivery in 4-7 days",
    "Cash on Delivery available",
]


class HomeHero(BaseModel):
    model_config = ConfigDict(extra="ignore")

    eyebrow: str = ""
    title_lines: List[str] = []
    subtitle: str = ""
    image: Optional[str] = None
    image_crop: Optional[ImageCrop] = None


class WhyBadge(BaseModel):
    model_config = ConfigDict(extra="ignore")

    icon: str = "Sparkles"
    title: str = ""
    copy: str = ""


class InstagramTile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    image: Optional[str] = None
    post_url: Optional[str] = None
    image_crop: Optional[ImageCrop] = None


class SiteSettings(BaseModel):
    """Singleton document (fixed id 'site') holding storefront-wide dynamic content."""

    model_config = ConfigDict(extra="ignore")

    id: str = "site"
    announcements: List[str] = DEFAULT_ANNOUNCEMENTS
    whatsapp_number: str = "917600565117"
    instagram_url: str = "https://www.instagram.com/rari.ethnic"
    home_hero: Optional[HomeHero] = None
    home_why: List[WhyBadge] = []
    instagram_tiles: List[InstagramTile] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SiteSettingsUpdate(BaseModel):
    announcements: Optional[List[str]] = None
    whatsapp_number: Optional[str] = None
    instagram_url: Optional[str] = None
    home_hero: Optional[HomeHero] = None
    home_why: Optional[List[WhyBadge]] = None
    instagram_tiles: Optional[List[InstagramTile]] = None
