from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_admin
from app.models.product import Product, ProductCreate, ProductUpdate
from app.repositories.product_repo import ProductRepository
from app.services.product_service import ProductService

router = APIRouter(prefix="/admin/products", tags=["admin:products"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list)
async def admin_list_products():
    return await ProductRepository.list_all()


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
