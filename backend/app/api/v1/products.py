from typing import Optional

from fastapi import APIRouter, HTTPException

from app.models.product import Product
from app.repositories.product_repo import ProductRepository

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list)
async def list_products(
    category: Optional[str] = None,
    is_bestseller: Optional[bool] = None,
    is_navratri: Optional[bool] = None,
    is_new: Optional[bool] = None,
):
    return await ProductRepository.list_public(
        category=category, is_bestseller=is_bestseller, is_navratri=is_navratri, is_new=is_new
    )


@router.get("/{slug}", response_model=Product)
async def get_product(slug: str):
    doc = await ProductRepository.get_by_slug(slug)
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc
