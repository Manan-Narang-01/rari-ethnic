from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

DEFAULT_ANNOUNCEMENTS = [
    "Handcrafted in Surat",
    "Free shipping over ₹2,000",
    "Pan-India delivery in 4-7 days",
    "Cash on Delivery available",
]


class HomeHero(BaseModel):
    model_config = ConfigDict(extra="ignore")

    eyebrow: str = ""
    title_lines: List[str] = []
    subtitle: str = ""
    image: Optional[str] = None


class HomeCategoryTile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    key: str = ""
    name: str = ""
    tag: str = ""
    image: Optional[str] = None
    color: str = "#A0684E"


class WhyBadge(BaseModel):
    model_config = ConfigDict(extra="ignore")

    icon: str = "Sparkles"
    title: str = ""
    copy: str = ""


class SiteSettings(BaseModel):
    """Singleton document (fixed id 'site') holding storefront-wide dynamic content."""

    model_config = ConfigDict(extra="ignore")

    id: str = "site"
    announcements: List[str] = DEFAULT_ANNOUNCEMENTS
    free_shipping_threshold: int = 2000
    shipping_fee: int = 99
    whatsapp_number: str = "919316565117"
    instagram_url: str = "https://www.instagram.com/rari.ethnic"
    home_hero: Optional[HomeHero] = None
    home_categories: List[HomeCategoryTile] = []
    home_why: List[WhyBadge] = []
    instagram_tiles: List[str] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SiteSettingsUpdate(BaseModel):
    announcements: Optional[List[str]] = None
    free_shipping_threshold: Optional[int] = None
    shipping_fee: Optional[int] = None
    whatsapp_number: Optional[str] = None
    instagram_url: Optional[str] = None
    home_hero: Optional[HomeHero] = None
    home_categories: Optional[List[HomeCategoryTile]] = None
    home_why: Optional[List[WhyBadge]] = None
    instagram_tiles: Optional[List[str]] = None
