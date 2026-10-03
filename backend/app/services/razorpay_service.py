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
    async def refund_payment(payment_id: str) -> dict:
        """Issues a full refund for a captured payment. Used when a payment's
        signature verifies as genuine but its order was already auto-
        cancelled by the pending_payment expiry sweep (see
        api/v1/payments.py) -- the money moved inside the Razorpay checkout
        widget before our server ever saw it, so the only correct response
        to a now-closed order is to hand it straight back, not just reject
        the request and leave the customer out of pocket."""
        key_id, key_secret = await RazorpayService._get_credentials()
        try:
            resp = requests.post(
                f"{RAZORPAY_API_BASE}/payments/{payment_id}/refund",
                auth=(key_id, key_secret),
                json={"speed": "optimum"},
                timeout=15,
            )
        except requests.RequestException as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Could not reach Razorpay to issue refund: {e}")

        if resp.status_code >= 400:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Razorpay refund failed: {resp.text}")

        return resp.json()

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

    @staticmethod
    async def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
        """Razorpay signs the exact raw webhook request body (HMAC-SHA256)
        with a separate "webhook secret" configured in their dashboard --
        deliberately not the same secret as verify_signature's key_secret,
        since this one is never sent to the browser at all. Must be computed
        over the untouched raw bytes, not a re-serialized/re-parsed version
        of the JSON, or the HMAC won't match even for a genuine request."""
        if not signature:
            return False
        integration = await IntegrationRepository.get_by_provider("payment", "razorpay")
        if not integration or not integration.get("is_enabled"):
            return False
        webhook_secret = decrypt(integration.get("credentials", {}).get("webhook_secret", ""))
        if not webhook_secret:
            return False
        expected = hmac.new(webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
