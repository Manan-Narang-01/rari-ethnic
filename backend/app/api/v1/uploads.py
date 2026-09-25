import logging
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import require_admin
from app.config import settings
from app.utils.storage import guess_content_type, put_object

router = APIRouter(prefix="/admin", tags=["admin:uploads"], dependencies=[Depends(require_admin)])
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

# Real magic-byte signatures for each allowed type. A file extension and the
# client-supplied Content-Type header are both attacker-controlled -- neither
# proves the uploaded bytes are actually an image. Without this check, an
# admin could upload e.g. an HTML/SVG payload renamed to `x.jpg`, which
# GET /api/files/{path} would later serve back with an image Content-Type;
# if a browser ever content-sniffs past that (older browsers, non-nosniff
# edge cases), that's a stored-XSS vector. Checking the real signature closes
# it regardless of what the filename or header claim.
_SIGNATURES = {
    "jpg": (b"\xff\xd8\xff",), "jpeg": (b"\xff\xd8\xff",),
    "png": (b"\x89PNG\r\n\x1a\n",),
    "gif": (b"GIF87a", b"GIF89a"),
    "webp": (b"RIFF",),  # full check (RIFF....WEBP) done below -- "WEBP" sits at offset 8
}


def _looks_like(ext: str, data: bytes) -> bool:
    sigs = _SIGNATURES.get(ext, ())
    if not any(data.startswith(sig) for sig in sigs):
        return False
    if ext == "webp":
        return data[8:12] == b"WEBP"
    return True


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
    if not _looks_like(ext, data):
        raise HTTPException(status_code=400, detail="File content doesn't match a valid image of that type")

    path = f"{settings.app_name}/products/{uuid.uuid4()}.{ext}"
    # Derived from the validated extension, not the client-supplied
    # file.content_type header (which, like the filename, is attacker-controlled).
    content_type = guess_content_type(file.filename, "image/jpeg")
    try:
        result = put_object(path, data, content_type)
    except Exception:
        logger.exception("Upload failed for %s", path)
        raise HTTPException(status_code=500, detail="Upload failed. Please try again.")

    stored_path = result["path"]
    return {
        "path": stored_path,
        "url": f"/api/files/{stored_path}",
        "size": result.get("size"),
    }
