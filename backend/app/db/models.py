"""SQLAlchemy table definitions -- one table per collection that existed in
Mongo. Scalar fields are real columns; fields that were arrays of primitives
or embedded Pydantic sub-models in the old documents (occasion/sizes/colors/
images, order/cart items, site-settings nested objects, campaign attribute
groups, integration fields/credentials, image crops) are JSONB columns, so
the stored shape matches what `app/models/*.py` already produces/expects
with no translation layer.

Foreign keys are added where the referenced side is never hard-deleted by
any repository today (users, orders) -- see docs/BACKEND_ARCHITECTURE.md.
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserRow(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, nullable=False, default="customer")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    picture: Mapped[str | None] = mapped_column(String, nullable=True)
    google_sub: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class RefreshSessionRow(Base):
    __tablename__ = "refresh_sessions"

    jti: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PasswordResetRow(Base):
    __tablename__ = "password_resets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class OtpRow(Base):
    __tablename__ = "otps"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String, nullable=False)
    registration: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ProductRow(Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_is_active_created_at", "is_active", "created_at"),
        Index("ix_products_categories_gin", "categories", postgresql_using="gin"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    categories: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    compare_at_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str] = mapped_column(String, nullable=False, default="")
    fabric: Mapped[str] = mapped_column(String, nullable=False, default="")
    care: Mapped[str] = mapped_column(String, nullable=False, default="")
    fit_notes: Mapped[str] = mapped_column(String, nullable=False, default="")
    occasion: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    sizes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    colors: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    color_hex: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    images: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    is_bestseller: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_new: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_navratri: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    navratri_day: Mapped[str | None] = mapped_column(String, nullable=True)
    edit_tag: Mapped[str | None] = mapped_column(String, nullable=True)
    shipping_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    shipping_charge: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class CategoryRow(Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index("ix_categories_is_active_sort_order", "is_active", "sort_order"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    key: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False, default="")
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    image_crop: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    show_in_navbar: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    show_in_catalog: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class OrderRow(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    order_number: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True, index=True)
    customer_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    address_line1: Mapped[str] = mapped_column(String, nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False)
    pincode: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    items: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    subtotal: Mapped[int] = mapped_column(Integer, nullable=False)
    shipping: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_method: Mapped[str] = mapped_column(String, nullable=False, default="COD")
    status: Mapped[str] = mapped_column(String, nullable=False, default="confirmed")
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    razorpay_order_id: Mapped[str | None] = mapped_column(String, nullable=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class CartRow(Base):
    __tablename__ = "carts"

    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    items: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SiteSettingsRow(Base):
    __tablename__ = "settings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    announcements: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    whatsapp_number: Mapped[str] = mapped_column(String, nullable=False, default="")
    instagram_url: Mapped[str] = mapped_column(String, nullable=False, default="")
    home_hero: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    home_why: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    instagram_tiles: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class CampaignRow(Base):
    __tablename__ = "campaigns"
    __table_args__ = (
        Index("ix_campaigns_is_active", "is_active"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False, default="navratri")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    theme: Mapped[str] = mapped_column(String, nullable=False, default="festive")
    # Page-level (not part of `sections`) because Home.jsx's own countdown badge
    # reads these directly, independent of whatever the Event page itself shows.
    countdown_target: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    countdown_label: Mapped[str] = mapped_column(String, nullable=False, default="")
    # Ordered list of {id, type, enabled, config} -- the page builder's content.
    # See app/models/campaign.py Section/SECTION_TYPES for the type catalog.
    sections: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class CampaignAuditLogRow(Base):
    __tablename__ = "campaign_audit_logs"
    __table_args__ = (
        Index("ix_campaign_audit_logs_campaign_id", "campaign_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    # No FK: a log must survive the campaign it describes being deleted.
    campaign_id: Mapped[str] = mapped_column(String, nullable=False)
    campaign_name: Mapped[str] = mapped_column(String, nullable=False)
    actor_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    actor_name: Mapped[str] = mapped_column(String, nullable=False)
    actor_email: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)  # created | updated | deleted
    changes: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)  # {field: {old, new}}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ExchangeRequestRow(Base):
    __tablename__ = "exchange_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str] = mapped_column(String, ForeignKey("orders.id"), nullable=False, index=True)
    order_number: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, nullable=False)
    order_total: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str] = mapped_column(String, nullable=False, default="")
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    admin_note: Mapped[str] = mapped_column(String, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class IntegrationRow(Base):
    __tablename__ = "integrations"
    __table_args__ = (
        UniqueConstraint("category", "provider", name="uq_integrations_category_provider"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    category: Mapped[str] = mapped_column(String, nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)
    fields: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    credentials: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SubscriberRow(Base):
    __tablename__ = "subscribers"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=False, default="footer")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ContactMessageRow(Base):
    __tablename__ = "contact_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    message: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
