from fastapi import APIRouter, HTTPException

from app.models.order import RazorpayVerify
from app.repositories.order_repo import OrderRepository
from app.services.integration_service import IntegrationService
from app.services.order_service import OrderService
from app.services.razorpay_service import RazorpayService

router = APIRouter(tags=["payments"])


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
    if order["status"] == "confirmed":
        return {"verified": True, "order_number": order_number}  # already verified -- idempotent

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

    if order["status"] != "pending_payment":
        # The signature is genuine -- a real payment happened -- but the
        # automatic pending_payment expiry sweep (see
        # OrderService.expire_stale_pending_payments) already cancelled this
        # order and released its stock, most likely because the customer
        # took longer than PENDING_PAYMENT_TIMEOUT_MINUTES to complete
        # checkout. Reviving the order would risk confirming it against
        # stock that's since sold to someone else, so instead we refund the
        # payment we can now prove actually happened -- the customer should
        # never end up charged with no order and no refund.
        #
        # Claiming the "refunded" transition (CAS) BEFORE calling Razorpay
        # means at most one concurrent /verify call (e.g. a duplicate
        # request) can ever reach the actual refund API -- the other(s) see
        # the claim already taken and skip straight to the same response
        # without double-refunding. If the refund call itself then fails,
        # the claim is reverted so the order isn't left falsely marked
        # refunded when no money has actually moved back yet.
        prior_status = order["status"]
        won = await OrderRepository.update_status(order_number, "refunded", expected_status=prior_status)
        if won:
            try:
                refund = await RazorpayService.refund_payment(payload.razorpay_payment_id)
            except HTTPException:
                await OrderRepository.update_status(order_number, prior_status, expected_status="refunded")
                raise
            await OrderRepository.update_by_order_number(order_number, {
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_refund_id": refund.get("id"),
            })
            refunded_order = await OrderRepository.get_by_order_number(order_number)
            await OrderService.notify_status_change(refunded_order, "refunded")
        raise HTTPException(
            status_code=409,
            detail="This order expired before payment could be confirmed. Your payment has been automatically refunded.",
        )

    await OrderRepository.update_by_order_number(order_number, {
        "status": "confirmed",
        "razorpay_payment_id": payload.razorpay_payment_id,
    })
    confirmed_order = await OrderRepository.get_by_order_number(order_number)
    await OrderService.notify_confirmed(confirmed_order)
    return {"verified": True, "order_number": order_number}
