import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import require_admin
from app.config import settings
from app.utils.storage import guess_content_type, put_object

router = APIRouter(prefix="/admin", tags=["admin:uploads"], dependencies=[Depends(require_admin)])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def admin_upload(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only image files allowed")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    path = f"{settings.app_name}/products/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or guess_content_type(file.filename, "image/jpeg")
    try:
        result = put_object(path, data, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    stored_path = result["path"]
    return {
        "path": stored_path,
        "url": f"/api/files/{stored_path}",
        "size": result.get("size"),
    }
