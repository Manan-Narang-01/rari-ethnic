"""ASGI entrypoint. Kept at this path/name because deployment (uvicorn
server:app) and the sandbox supervisor config point here; all real code
lives under app/ (see app/main.py)."""
from app.main import app  # noqa: F401
