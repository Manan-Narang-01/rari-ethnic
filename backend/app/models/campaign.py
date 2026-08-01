import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.image_crop import ImageCrop


class EventAttributeItem(BaseModel):
    """One entry within an attribute group -- deliberately generic so the
    same shape fits a Navratri day-colour ("Day 1", orange, "Energy &
    vitality"), a schedule entry ("Day 1 - Ghatasthapana", "Oct 12, 6 AM",
    description), a special offer, a highlight, etc. Fields that don't apply
    to a given use are just left blank."""

    model_config = ConfigDict(extra="ignore")

    order: int = 0
    title: str = ""
    subtitle: str = ""
    description: str = ""
    color: Optional[str] = None
    icon: Optional[str] = None


class EventAttributeGroup(BaseModel):
    """A named, admin-defined section of an event (e.g. "Day Colours",
    "Schedule", "Special Offers") holding a list of items. Any event type can
    define any number of these without the Campaign model itself needing to
    change -- new event kinds are just new groups, not new code."""

    model_config = ConfigDict(extra="ignore")

    key: str = ""  # auto-slugified from title if omitted; stable id for lookup
    title: str = ""
    items: List[EventAttributeItem] = []


class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str = "navratri"
    is_active: bool = False
    theme: str = "festive"  # festive | default
    countdown_target: Optional[datetime] = None
    countdown_label: str = "Navratri arrives in"
    hero_eyebrow: str = ""
    hero_title: str = ""
    hero_subtitle: str = ""
    hero_image: Optional[str] = None
    hero_image_crop: Optional[ImageCrop] = None
    hero_secondary_image: Optional[str] = None
    hero_secondary_image_crop: Optional[ImageCrop] = None
    cta_label: str = "Shop the drop"
    order_by_note: str = ""
    shloka: str = ""
    shloka_translation: str = ""
    attribute_groups: List[EventAttributeGroup] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CampaignCreate(BaseModel):
    name: str
    slug: str = "navratri"
    is_active: bool = False
    theme: str = "festive"
    countdown_target: Optional[datetime] = None
    countdown_label: str = "Navratri arrives in"
    hero_eyebrow: str = ""
    hero_title: str = ""
    hero_subtitle: str = ""
    hero_image: Optional[str] = None
    hero_image_crop: Optional[ImageCrop] = None
    hero_secondary_image: Optional[str] = None
    hero_secondary_image_crop: Optional[ImageCrop] = None
    cta_label: str = "Shop the drop"
    order_by_note: str = ""
    shloka: str = ""
    shloka_translation: str = ""
    attribute_groups: List[EventAttributeGroup] = []


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    is_active: Optional[bool] = None
    theme: Optional[str] = None
    countdown_target: Optional[datetime] = None
    countdown_label: Optional[str] = None
    hero_eyebrow: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_image: Optional[str] = None
    hero_image_crop: Optional[ImageCrop] = None
    hero_secondary_image: Optional[str] = None
    hero_secondary_image_crop: Optional[ImageCrop] = None
    cta_label: Optional[str] = None
    order_by_note: Optional[str] = None
    shloka: Optional[str] = None
    shloka_translation: Optional[str] = None
    attribute_groups: Optional[List[EventAttributeGroup]] = None
