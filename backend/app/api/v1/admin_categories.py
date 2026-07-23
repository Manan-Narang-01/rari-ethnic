from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_admin
from app.models.category import Category, CategoryCreate, CategoryUpdate
from app.repositories.category_repo import CategoryRepository
from app.services.category_service import CategoryService

router = APIRouter(prefix="/admin/categories", tags=["admin:categories"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list)
async def admin_list_categories():
    return await CategoryRepository.list_all()


@router.get("/{category_id}", response_model=Category)
async def admin_get_category(category_id: str):
    category = await CategoryRepository.get_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.post("", response_model=Category)
async def admin_create_category(payload: CategoryCreate):
    return await CategoryService.create(payload)


@router.put("/{category_id}", response_model=Category)
async def admin_update_category(category_id: str, payload: CategoryUpdate):
    return await CategoryService.update(category_id, payload)


@router.delete("/{category_id}")
async def admin_delete_category(category_id: str):
    await CategoryService.delete(category_id)
    return {"deleted": True}
