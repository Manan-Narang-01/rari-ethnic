"""Central runtime configuration, read once from the environment at import time.

Failing fast here (missing env var -> ImportError) is intentional: we want a
misconfigured deployment to refuse to boot rather than fail on the first
request that happens to need the missing value.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")


def _normalize_database_url(raw: str) -> str:
    """Accepts a plain `postgresql://...` (e.g. pasted straight from Neon/Render/
    pgAdmin) and upgrades it to the asyncpg driver scheme SQLAlchemy needs,
    so no provider-specific connection-string editing is required."""
    if raw.startswith("postgresql://"):
        return "postgresql+asyncpg://" + raw[len("postgresql://"):]
    if raw.startswith("postgres://"):  # some providers still hand out the old scheme
        return "postgresql+asyncpg://" + raw[len("postgres://"):]
    return raw


class Settings:
    database_url: str = _normalize_database_url(os.environ["DATABASE_URL"])
    app_name: str = os.environ.get("APP_NAME", "rariethnic")

    jwt_secret: str = os.environ["JWT_SECRET"]
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    refresh_token_expire_days: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

    # Seeding is optional: if unset, that role simply isn't created at startup.
    admin_email: str = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    admin_password: str = os.environ.get("ADMIN_PASSWORD", "")
    super_admin_email: str = os.environ.get("SUPER_ADMIN_EMAIL", "").strip().lower()
    super_admin_password: str = os.environ.get("SUPER_ADMIN_PASSWORD", "")

    # Deny-by-default when unset, rather than "*" -- combined with the
    # `allow_credentials=True` CORSMiddleware setting in app/main.py, a "*"
    # default lets Starlette reflect any Origin back as allowed (its documented
    # behavior for wildcard-with-credentials), which is equivalent to trusting
    # every website on the internet. An explicit CORS_ORIGINS was already
    # required by docs/DEPLOYMENT.md for production; this just makes an
    # unset/misconfigured value fail closed instead of silently wide open.
    cors_origins: list = [o for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
    backend_public_url: str = os.environ.get("BACKEND_PUBLIC_URL", "")
    # Used to build links inside emails (password reset, etc.). Falls back to
    # the first configured CORS origin so this doesn't need separate setup
    # in the common case where that's already the storefront's real URL.
    frontend_public_url: str = os.environ.get("FRONTEND_PUBLIC_URL", "") or os.environ.get("CORS_ORIGINS", "").split(",")[0]
    emergent_llm_key: str = os.environ.get("EMERGENT_LLM_KEY", "")

    # Customer-facing Google Sign-In. Dev login is a passwordless fallback for
    # testing before OAuth is configured, and is auto-enabled while
    # google_client_id is unset (or explicitly via ALLOW_DEV_LOGIN=true).
    google_client_id: str = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    allow_dev_login: bool = os.environ.get("ALLOW_DEV_LOGIN", "").strip().lower() == "true"

    credentials_encryption_key: str = os.environ["CREDENTIALS_ENCRYPTION_KEY"]


settings = Settings()
