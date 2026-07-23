"""Storage-shape model for the `users` collection. One collection holds all
three roles (customer / admin / super_admin) distinguished by `role`, rather
than separate tables, since RBAC is enforced in code (see app/api/deps.py)
not by physical storage separation."""
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

ROLES = {"customer", "admin", "super_admin"}


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    email: str
    phone: Optional[str] = None
    password_hash: Optional[str] = None  # None for Google/dev-login-only customers
    role: str = "customer"
    is_active: bool = True
    email_verified: bool = False
    picture: Optional[str] = None
    google_sub: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
