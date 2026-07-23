from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.utils.storage import get_object

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/{path:path}")
async def download_file(path: str):
    try:
        data, content_type = get_object(path)
        return Response(content=data, media_type=content_type, headers={"Cache-Control": "public, max-age=31536000"})
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {e}")
