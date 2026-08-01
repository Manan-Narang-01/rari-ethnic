import hashlib
import hmac

import requests
from fastapi import HTTPException, status

from app.repositories.integration_repo import IntegrationRepository
from app.utils.crypto import decrypt

RAZORPAY_API_BASE = "https://api.razorpay.com/v1"


class RazorpayService:
    @staticmethod
    async def _get_credentials():
        integration = await IntegrationRepository.get_by_provider("payment", "razorpay")
        if not integration or not integration.get("is_enabled"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay is not enabled")
        creds = integration.get("credentials", {})
        key_id = decrypt(creds.get("key_id", ""))
        key_secret = decrypt(creds.get("key_secret", ""))
        if not key_id or not key_secret:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay credentials are not fully configured")
        return key_id, key_secret

    @staticmethod
    async def create_order(order: dict) -> dict:
        """Creates a Razorpay Order (their side, not ours) for this order's
        server-authoritative total. This does not move money by itself -- it
        just registers an order the checkout widget can attach a payment to;
        money only moves once the customer completes that widget."""
        key_id, key_secret = await RazorpayService._get_credentials()
        try:
            resp = requests.post(
                f"{RAZORPAY_API_BASE}/orders",
                auth=(key_id, key_secret),
                json={
                    "amount": order["total"] * 100,  # smallest currency unit (paise)
                    "currency": "INR",
                    "receipt": order["order_number"],
                    "notes": {"order_number": order["order_number"]},
                },
                timeout=15,
            )
        except requests.RequestException as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not reach Razorpay: {e}")

        if resp.status_code >= 400:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Razorpay order creation failed: {resp.text}")

        data = resp.json()
        return {"razorpay_order_id": data["id"], "key_id": key_id, "amount": data["amount"], "currency": data["currency"]}

    @staticmethod
    async def verify_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
        """Razorpay signs order_id|payment_id with the merchant's key_secret
        (HMAC-SHA256); this is the only trustworthy proof a payment actually
        succeeded -- the browser's own claim that checkout finished is never
        sufficient on its own, since it's fully attacker-controlled."""
        _, key_secret = await RazorpayService._get_credentials()
        expected = hmac.new(
            key_secret.encode(),
            f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, razorpay_signature)
