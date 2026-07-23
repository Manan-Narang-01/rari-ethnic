from fastapi import HTTPException, status

from app.models.category import Category, CategoryCreate, CategoryUpdate
from app.repositories.category_repo import CategoryRepository
from app.repositories.product_repo import ProductRepository
from app.utils.slugify import slugify


class CategoryService:
    @staticmethod
    async def create(payload: CategoryCreate) -> Category:
        data = payload.model_dump()
        if not data.get("key"):
            base = slugify(data["name"])
            key = base
            i = 1
            while await CategoryRepository.key_exists(key):
                i += 1
                key = f"{base}-{i}"
            data["key"] = key
        elif await CategoryRepository.key_exists(data["key"]):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category key already exists")

        category = Category(**data)
        doc = category.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await CategoryRepository.insert(doc)
        return category

    @staticmethod
    async def update(category_id: str, payload: CategoryUpdate) -> dict:
        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
        if "key" in updates and await CategoryRepository.key_exists(updates["key"], exclude_id=category_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category key already exists")

        if not await CategoryRepository.update(category_id, updates):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return await CategoryRepository.get_by_id(category_id)

    @staticmethod
    async def delete(category_id: str) -> None:
        category = await CategoryRepository.get_by_id(category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        # Check every product, not just active/public ones -- a hidden (is_active=False)
        # product still referencing this category should still block deletion.
        all_products = await ProductRepository.list_all()
        in_use = [p for p in all_products if p.get("category") == category["key"]]
        if in_use:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete: {len(in_use)} product(s) still use this category",
            )
        await CategoryRepository.delete(category_id)
