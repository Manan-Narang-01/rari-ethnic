from fastapi import APIRouter

from app.repositories.category_repo import CategoryRepository

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list)
async def list_categories():
    return await CategoryRepository.list_public()
