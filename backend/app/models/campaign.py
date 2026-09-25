import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

# The page-builder's type catalog. `Section.config` is deliberately untyped
# (Dict[str, Any]) rather than a discriminated union of 9 models -- each
# type's shape is owned by its admin editor / renderer pair on the frontend
# (frontend/src/components/admin/events/*, frontend/src/components/events/*),
# matching this codebase's existing convention for other free-form JSON blobs
# (e.g. Integration.credentials). The backend only validates that `type` is
# one of these and that sections stay a well-formed list.
SECTION_TYPES = {
    "hero", "countdown", "shloka", "product_grid", "attribute_grid",
    "urgency_banner", "rich_text", "image_gallery", "faq_accordion",
}


class Section(BaseModel):
    """One block on the event page. `id` is client-generated (a uuid) so drag
    reorders and edits can reference a section stably without depending on
    its position in the list."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    enabled: bool = True
    config: Dict[str, Any] = {}


class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str = "navratri"
    is_active: bool = False
    theme: str = "festive"  # festive | default
    # Page-level, not part of `sections` -- Home.jsx's own countdown badge
    # reads these directly, independent of the Event page's own content.
    countdown_target: Optional[datetime] = None
    countdown_label: str = "Navratri arrives in"
    sections: List[Section] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CampaignCreate(BaseModel):
    name: str
    slug: str = "navratri"
    is_active: bool = False
    theme: str = "festive"
    countdown_target: Optional[datetime] = None
    countdown_label: str = "Navratri arrives in"
    sections: List[Section] = []


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    is_active: Optional[bool] = None
    theme: Optional[str] = None
    countdown_target: Optional[datetime] = None
    countdown_label: Optional[str] = None
    sections: Optional[List[Section]] = None


class CampaignAuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    campaign_name: str
    actor_id: str
    actor_name: str
    actor_email: str
    action: str  # created | updated | deleted
    changes: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
