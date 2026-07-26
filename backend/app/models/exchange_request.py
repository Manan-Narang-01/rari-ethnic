import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

EXCHANGE_WINDOW_DAYS = 15
VALID_EXCHANGE_STATUSES = {"pending", "approved", "rejected", "completed"}


class ExchangeRequestCreate(BaseModel):
    reason: str
    notes: str = ""


class ExchangeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    order_number: str
    user_id: str
    # Denormalized from the order at creation time so admin can act on a
    # request without a second lookup.
    customer_name: str
    email: str
    phone: str
    order_total: int
    reason: str
    notes: str = ""
    status: str = "pending"  # pending | approved | rejected | completed
    admin_note: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ExchangeRequestStatusUpdate(BaseModel):
    status: str
    admin_note: Optional[str] = None
