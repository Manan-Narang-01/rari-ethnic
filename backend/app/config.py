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


class Settings:
    mongo_url: str = os.environ["MONGO_URL"]
    db_name: str = os.environ["DB_NAME"]
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

    cors_origins: list = os.environ.get("CORS_ORIGINS", "*").split(",")
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
