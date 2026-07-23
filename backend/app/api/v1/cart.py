from fastapi import APIRouter, Depends

from app.api.deps import require_customer
from app.models.cart import Cart, CartReplace
from app.repositories.cart_repo import CartRepository

router = APIRouter(prefix="/me/cart", tags=["cart"])


@router.get("", response_model=Cart)
async def get_cart(user: dict = Depends(require_customer)):
    cart = await CartRepository.get_by_user(user["id"])
    return cart or Cart(user_id=user["id"], items=[])


@router.put("", response_model=Cart)
async def replace_cart(payload: CartReplace, user: dict = Depends(require_customer)):
    return await CartRepository.upsert(user["id"], [i.model_dump() for i in payload.items])


@router.delete("")
async def clear_cart(user: dict = Depends(require_customer)):
    await CartRepository.clear(user["id"])
    return {"cleared": True}
