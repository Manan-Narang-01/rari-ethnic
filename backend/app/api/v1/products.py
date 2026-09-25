from typing import Optional

from fastapi import APIRouter, HTTPException, Response

from app.models.product import Product
from app.repositories.product_repo import ProductRepository

router = APIRouter(prefix="/products", tags=["products"])

MAX_PAGE_SIZE = 100


@router.get("", response_model=list)
async def list_products(
    response: Response,
    category: Optional[str] = None,
    is_bestseller: Optional[bool] = None,
    is_navratri: Optional[bool] = None,
    is_new: Optional[bool] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: Optional[int] = None,
):
    if limit is None:
        # No pagination requested -- exact prior behavior (every existing
        # caller: Home's bestseller/new-arrival strips, ProductGridSection on
        # event pages, etc.) is completely unaffected by this endpoint
        # gaining search/pagination support.
        return await ProductRepository.list_public(
            category=category, is_bestseller=is_bestseller, is_navratri=is_navratri, is_new=is_new, q=q,
        )

    capped_limit = max(1, min(limit, MAX_PAGE_SIZE))
    # Fetch one extra row so we can tell "there's more" from "that's everything"
    # without changing the response body's shape (still a plain array) -- the
    # answer goes in a response header instead.
    rows = await ProductRepository.list_public(
        category=category, is_bestseller=is_bestseller, is_navratri=is_navratri, is_new=is_new,
        q=q, skip=skip, limit=capped_limit + 1,
    )
    response.headers["X-Has-More"] = "true" if len(rows) > capped_limit else "false"
    return rows[:capped_limit]


@router.get("/{slug}", response_model=Product)
async def get_product(slug: str):
    doc = await ProductRepository.get_by_slug(slug)
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return doc
