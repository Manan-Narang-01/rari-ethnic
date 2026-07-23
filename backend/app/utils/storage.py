"""Local-filesystem object storage for local development. Swap this module for
an S3-compatible client (see docs/DEPLOYMENT.md section 4 for a drop-in
boto3-based replacement) before deploying anywhere beyond your own machine --
callers only depend on init_storage/put_object/get_object/guess_content_type."""
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


def init_storage() -> str:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return str(STORAGE_DIR)


def _safe_path(path: str) -> Path:
    """Resolves `path` under STORAGE_DIR and rejects anything that would
    escape it (e.g. `../../etc/passwd` arriving via the public /files/{path} route)."""
    full = (STORAGE_DIR / path).resolve()
    if STORAGE_DIR.resolve() not in full.parents and full != STORAGE_DIR.resolve():
        raise ValueError("Invalid path")
    return full


def put_object(path: str, data: bytes, content_type: str) -> dict:
    file_path = _safe_path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(data)
    return {"path": path, "size": len(data)}


def get_object(path: str):
    file_path = _safe_path(path)
    if not file_path.is_file():
        raise FileNotFoundError(f"{path} not found")
    return file_path.read_bytes(), guess_content_type(path)


MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
}


def guess_content_type(filename: str, fallback: str = "application/octet-stream") -> str:
    if "." in filename:
        ext = filename.rsplit(".", 1)[1].lower()
        return MIME_TYPES.get(ext, fallback)
    return fallback
