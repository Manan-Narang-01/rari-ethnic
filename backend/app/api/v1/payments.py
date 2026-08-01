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

    valid = await RazorpayService.verify_signature(
        payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    )
    if not valid:
        raise HTTPException(status_code=400, detail="Payment verification failed")

    await OrderRepository.update_by_order_number(order_number, {
        "status": "confirmed",
        "razorpay_payment_id": payload.razorpay_payment_id,
    })
    confirmed_order = await OrderRepository.get_by_order_number(order_number)
    await OrderService.notify_confirmed(confirmed_order)
    return {"verified": True, "order_number": order_number}
