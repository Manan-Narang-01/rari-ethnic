import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrderItem(BaseModel):
    product_id: str
    slug: str
    name: str
    price: int
    quantity: int
    size: Optional[str] = None
    image: Optional[str] = None


class OrderCreate(BaseModel):
    customer_name: str
    email: EmailStr
    # Client already validates these more precisely (10-digit Indian mobile,
    # optional +91 prefix); the server-side pattern is deliberately looser
    # (allows spaces/dashes/+prefix) so it can't reject something the client
    # already accepted -- it only exists to stop obviously-garbage values
    # (letters, wrong length) from ever reaching an order record and a real
    # delivery.
    phone: str = Field(pattern=r"^\+?[\d\s-]{10,15}$")
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str = Field(pattern=r"^\d{6}$")
    notes: Optional[str] = None
    items: List[OrderItem]
    subtotal: int
    shipping: int
    total: int
    payment_method: str = "COD"


class Order(OrderCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: "RE" + uuid.uuid4().hex[:8].upper())
    # Set when the request carried a valid access token; null for guest checkout.
    user_id: Optional[str] = None
    # pending_payment | confirmed | dispatched | delivered | cancelled | refunded.
    # Online-payment orders start at pending_payment and only move to
    # confirmed once RazorpayService.verify_payment succeeds server-side --
    # COD orders skip straight to confirmed (see OrderService.create).
    status: str = "confirmed"
    delivered_at: Optional[datetime] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    # Set only by the system when a genuinely-valid payment is confirmed
    # after its order was already auto-cancelled by the pending_payment
    # expiry sweep (see api/v1/payments.py verify_razorpay_payment) -- never
    # settable through the normal admin status-update endpoint, since that
    # would let "refunded" be claimed without a real refund ever happening.
    razorpay_refund_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderStatusUpdate(BaseModel):
    status: str


class RazorpayVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# "refunded" is a system-only terminal status (see razorpay_refund_id above)
# -- deliberately left out of ORDER_STATUS_TRANSITIONS below, so it can never
# be reached through the admin's generic status-update endpoint, only through
# the verified-refund code path in api/v1/payments.py.
VALID_ORDER_STATUSES = {"pending_payment", "confirmed", "dispatched", "delivered", "cancelled", "refunded"}

# Forward-only state machine -- delivered/cancelled are terminal, and a status
# can only move to one of these from its current value (same-status is always
# implicitly allowed as a no-op by the caller). Without this, the admin PATCH
# endpoint accepted any of the 5 values from any other value, so e.g. a
# cancelled order could be marked delivered, or delivered walked back to
# pending_payment.
ORDER_STATUS_TRANSITIONS = {
    "pending_payment": {"confirmed", "cancelled"},
    "confirmed": {"dispatched", "cancelled"},
    "dispatched": {"delivered", "cancelled"},
    "delivered": set(),
    "cancelled": set(),
    "refunded": set(),
}
