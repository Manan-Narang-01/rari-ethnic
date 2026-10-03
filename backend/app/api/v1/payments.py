import json
import logging

from fastapi import APIRouter, HTTPException, Request

from app.models.order import RazorpayVerify
from app.repositories.order_repo import OrderRepository
from app.services.integration_service import IntegrationService
from app.services.order_service import OrderService
from app.services.razorpay_service import RazorpayService

router = APIRouter(tags=["payments"])
logger = logging.getLogger(__name__)


@router.get("/payment-methods")
async def list_payment_methods():
    return await IntegrationService.list_payment_methods_public()


@router.post("/orders/{order_number}/razorpay/create-order")
async def create_razorpay_order(order_number: str):
    order = await OrderRepository.get_by_order_number(order_number)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="This order is not awaiting payment")

    result = await RazorpayService.create_order(order)
    await OrderRepository.update_by_order_number(order_number, {"razorpay_order_id": result["razorpay_order_id"]})
    return result


@router.post("/orders/{order_number}/razorpay/verify")
async def verify_razorpay_payment(order_number: str, payload: RazorpayVerify):
    order = await OrderRepository.get_by_order_number(order_number)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("razorpay_order_id") != payload.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order ID mismatch")

    # Verified before branching on status: Razorpay charges the customer
    # inside the checkout widget, before this endpoint is ever called, so by
    # the time we get here the money may already have moved regardless of
    # what our order record says -- we need to know whether that's actually
    # true before deciding what to do about it.
    valid = await RazorpayService.verify_signature(
        payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    )
    if not valid:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    result = await OrderService.confirm_or_refund_payment(order, payload.razorpay_payment_id)
    if result["outcome"] in ("confirmed", "already_confirmed"):
        return {"verified": True, "order_number": order_number}

    # "refunded" or "already_handled" -- either way, by now the order is
    # closed and (if a genuine payment was involved) any money has already
    # been sent back automatically; the customer needs to check out again.
    raise HTTPException(
        status_code=409,
        detail="This order expired before payment could be confirmed. Your payment has been automatically refunded.",
    )


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    """Server-to-server backstop for payment confirmation: the client-driven
    /verify route above only fires if the customer's browser survives long
    enough to call it after paying. If they pay and then close the tab, lose
    connection, or the app crashes right after Razorpay captures the
    payment, /verify never runs and that payment would otherwise sit
    unreconciled -- eventually refunded only if/when the customer notices
    and contacts support. Subscribing to Razorpay's `payment.captured` event
    here means we find out independently of the browser, and run the exact
    same confirm-or-refund logic as /verify (OrderService.confirm_or_refund_payment).

    Must be registered in the Razorpay dashboard pointed at this URL, with
    the same secret stored as this account's "Webhook secret" credential
    (Admin -> Integrations -> Razorpay) -- see RazorpayService.verify_webhook_signature.
    Always returns 200 once the signature checks out, even for events we
    ignore, so Razorpay doesn't retry-storm us for events we don't act on."""
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not await RazorpayService.verify_webhook_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = json.loads(body)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if event.get("event") != "payment.captured":
        return {"status": "ignored"}

    payment_entity = event.get("payload", {}).get("payment", {}).get("entity", {})
    razorpay_payment_id = payment_entity.get("id")
    razorpay_order_id = payment_entity.get("order_id")
    if not razorpay_payment_id or not razorpay_order_id:
        return {"status": "ignored"}

    order = await OrderRepository.get_by_razorpay_order_id(razorpay_order_id)
    if not order:
        # Not one of our orders (or it's since been deleted) -- nothing to
        # reconcile. Still 200: this isn't an error on Razorpay's end.
        logger.warning("Razorpay webhook: no order found for razorpay_order_id %s", razorpay_order_id)
        return {"status": "ignored"}

    result = await OrderService.confirm_or_refund_payment(order, razorpay_payment_id)
    return {"status": "ok", "outcome": result["outcome"]}
