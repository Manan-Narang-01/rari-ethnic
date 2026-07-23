from fastapi import HTTPException, status

from app.models.product import Product, ProductCreate, ProductUpdate
from app.repositories.category_repo import CategoryRepository
from app.repositories.product_repo import ProductRepository
from app.utils.slugify import slugify


class ProductService:
    @staticmethod
    async def create(payload: ProductCreate) -> Product:
        await ProductService._check_category(payload.category)
        data = payload.model_dump()
        if not data.get("slug"):
            base = slugify(data["name"])
            slug = base
            i = 1
            while await ProductRepository.slug_exists(slug):
                i += 1
                slug = f"{base}-{i}"
            data["slug"] = slug
        elif await ProductRepository.slug_exists(data["slug"]):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")

        product = Product(**data)
        doc = product.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await ProductRepository.insert(doc)
        return product

    @staticmethod
    async def update(product_id: str, payload: ProductUpdate) -> dict:
        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
        if "category" in updates:
            await ProductService._check_category(updates["category"])
        if "slug" in updates and await ProductRepository.slug_exists(updates["slug"], exclude_id=product_id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")

        if not await ProductRepository.update(product_id, updates):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return await ProductRepository.get_by_id(product_id)

    @staticmethod
    async def _check_category(category_key: str) -> None:
        if not await CategoryRepository.get_by_key(category_key):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown category: {category_key}")
