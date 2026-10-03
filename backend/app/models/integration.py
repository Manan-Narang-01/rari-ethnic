import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

VALID_CATEGORIES = {"payment", "shipping", "email"}

# Seed data only -- used once to populate the collection on first run (see
# IntegrationRepository.ensure_defaults). After that, label/fields/credentials
# live on the document itself so Super Admins can create/edit/delete their
# own custom providers too, not just this starter set.
PROVIDER_CATALOG = {
    "payment": {
        "stripe": {"label": "Stripe", "fields": [
            {"key": "publishable_key", "label": "Publishable key"},
            {"key": "secret_key", "label": "Secret key"},
        ]},
        "razorpay": {"label": "Razorpay", "fields": [
            {"key": "key_id", "label": "Key ID"},
            {"key": "key_secret", "label": "Key secret"},
            # Set when registering a webhook (for payment.captured) in the
            # Razorpay dashboard pointed at /api/webhooks/razorpay -- must
            # match the secret entered there exactly. See
            # RazorpayService.verify_webhook_signature.
            {"key": "webhook_secret", "label": "Webhook secret"},
        ]},
        "paypal": {"label": "PayPal", "fields": [
            {"key": "client_id", "label": "Client ID"},
            {"key": "client_secret", "label": "Client secret"},
        ]},
        "cod": {"label": "Cash on Delivery", "fields": []},
    },
    "shipping": {
        "shiprocket": {"label": "Shiprocket", "fields": [
            {"key": "email", "label": "Account email"},
            {"key": "password", "label": "Password"},
        ]},
        "delhivery": {"label": "Delhivery", "fields": [
            {"key": "api_token", "label": "API token"},
        ]},
        "bluedart": {"label": "Blue Dart", "fields": [
            {"key": "login_id", "label": "Login ID"},
            {"key": "license_key", "label": "License key"},
        ]},
        "dhl": {"label": "DHL", "fields": [
            {"key": "account_number", "label": "Account number"},
            {"key": "api_key", "label": "API key"},
        ]},
    },
    "email": {
        "smtp": {"label": "SMTP", "fields": [
            {"key": "host", "label": "SMTP host"},
            {"key": "port", "label": "Port"},
            {"key": "username", "label": "Username"},
            {"key": "password", "label": "Password"},
            {"key": "from_email", "label": "From email"},
            {"key": "from_name", "label": "From name"},
        ]},
    },
}


class IntegrationField(BaseModel):
    model_config = ConfigDict(extra="ignore")
    key: str
    label: str


class Integration(BaseModel):
    """Full-fidelity document -- `credentials` values are Fernet ciphertext,
    never returned directly by any route (see IntegrationService._to_public)."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str  # "payment" | "shipping"
    provider: str  # slug, unique within its category
    label: str
    fields: List[IntegrationField] = []
    is_enabled: bool = False
    credentials: Dict[str, str] = {}
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class IntegrationFieldCreate(BaseModel):
    label: str
    key: Optional[str] = None  # auto-slugified from label if omitted


class IntegrationCreate(BaseModel):
    category: str
    label: str
    provider: Optional[str] = None  # auto-slugified from label if omitted
    fields: List[IntegrationFieldCreate] = []
    is_enabled: bool = False
    credentials: Dict[str, str] = {}


class IntegrationUpdate(BaseModel):
    """Super-admin-only update payload. A blank/omitted credential field
    leaves the existing stored value untouched -- the real value is never
    round-tripped back to the browser to be edited in place."""

    label: Optional[str] = None
    is_enabled: Optional[bool] = None
    fields: Optional[List[IntegrationField]] = None
    credentials: Optional[Dict[str, str]] = None
