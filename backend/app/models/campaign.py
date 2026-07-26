import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DayColor(BaseModel):
    model_config = ConfigDict(extra="ignore")

    day: int = 0
    name: str = ""
    hex: str = "#A0684E"
    meaning: str = ""


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
    countdown_target: Optional[datetime] = None
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
    countdown_target: Optional[datetime] = None
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
