from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.deps import require_admin
from app.models.product import Product, ProductCreate, ProductUpdate
from app.repositories.product_repo import ProductRepository
from app.services.product_service import ProductService

router = APIRouter(prefix="/admin/products", tags=["admin:products"], dependencies=[Depends(require_admin)])

MAX_PAGE_SIZE = 100


@router.get("", response_model=list)
async def admin_list_products(
    response: Response,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: Optional[int] = None,
):
    if limit is None:
        return await ProductRepository.list_all(category=category, is_active=is_active, q=q)  # unpaginated default, unchanged

    capped_limit = max(1, min(limit, MAX_PAGE_SIZE))
    rows = await ProductRepository.list_all(category=category, is_active=is_active, q=q, skip=skip, limit=capped_limit + 1)
    response.headers["X-Has-More"] = "true" if len(rows) > capped_limit else "false"
    return rows[:capped_limit]


@router.get("/{product_id}", response_model=Product)
async def admin_get_product(product_id: str):
    product = await ProductRepository.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=Product)
async def admin_create_product(payload: ProductCreate):
    return await ProductService.create(payload)


@router.put("/{product_id}", response_model=Product)
async def admin_update_product(product_id: str, payload: ProductUpdate):
    return await ProductService.update(product_id, payload)


@router.delete("/{product_id}")
async def admin_delete_product(product_id: str):
    if not await ProductRepository.delete(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": True}
