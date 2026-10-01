import asyncio
import logging

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.cors import CORSMiddleware

from app import database
from app.api.v1.router import api_router
from app.config import settings
from app.core.rate_limit import limiter
from app.core.security import hash_password, verify_password
from app.repositories.campaign_repo import CampaignRepository
from app.repositories.cart_repo import CartRepository
from app.repositories.category_repo import CategoryRepository
from app.repositories.exchange_request_repo import ExchangeRequestRepository
from app.repositories.integration_repo import IntegrationRepository
from app.repositories.order_repo import OrderRepository
from app.repositories.otp_repo import OtpRepository
from app.repositories.password_reset_repo import PasswordResetRepository
from app.repositories.product_repo import ProductRepository
from app.repositories.session_repo import SessionRepository
from app.repositories.site_settings_repo import SiteSettingsRepository
from app.repositories.user_repo import UserRepository
from app.services.order_service import OrderService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Rari Ethnic API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    # Custom response headers aren't visible to browser JS by default under
    # CORS -- must be explicitly exposed. (A "*" wildcard here is ignored by
    # the Fetch spec whenever allow_credentials is True, so it has to be named.)
    expose_headers=["X-Has-More"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    """Baseline hardening headers for a JSON API + file-serving backend.
    No Content-Security-Policy here deliberately: this process doesn't render
    the storefront's HTML (that's the separate CRA app) and a CSP tuned for a
    JSON/file API would either be a no-op or break FastAPI's own /docs page
    (which loads its UI from a CDN) -- CSP belongs on the frontend's hosting
    layer instead."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


_pending_payment_expiry_task: asyncio.Task = None


async def _pending_payment_expiry_loop():
    """Runs OrderService.expire_stale_pending_payments on a fixed interval
    for the lifetime of the process -- see PENDING_PAYMENT_TIMEOUT_MINUTES/
    PENDING_PAYMENT_SWEEP_INTERVAL_SECONDS in app/config.py. A single-process
    asyncio loop is enough at this app's current scale; if this backend ever
    runs as multiple worker processes, every worker will redundantly run this
    sweep (harmless -- each cancellation is a compare-and-swap, so only one
    worker's update actually wins and restocks any given order -- just
    wasted duplicate query work, not a correctness issue)."""
    while True:
        await asyncio.sleep(settings.pending_payment_sweep_interval_seconds)
        try:
            count = await OrderService.expire_stale_pending_payments()
            if count:
                logger.info("Auto-cancelled %d stale pending_payment order(s)", count)
        except Exception as e:
            logger.error("Pending-payment expiry sweep failed: %s", e)


async def _seed_role(email: str, password: str, role: str) -> None:
    if not email or not password:
        return
    existing = await UserRepository.get_by_email(email)
    if existing is None:
        await UserRepository.create(name=role.replace("_", " ").title(), email=email,
                                     password_hash=hash_password(password), role=role, email_verified=True)
        logger.info("Seeded %s user: %s", role, email)
    elif not verify_password(password, existing["password_hash"]):
        await UserRepository.update_password(existing["id"], hash_password(password))
        logger.info("Updated %s password hash from .env for %s", role, email)


@app.on_event("startup")
async def startup_tasks():
    database.connect()

    try:
        from app.utils.storage import init_storage
        init_storage()
    except Exception as e:
        logger.warning("Storage init failed at startup (will retry on demand): %s", e)

    try:
        await UserRepository.ensure_indexes()
        await SessionRepository.ensure_indexes()
        await PasswordResetRepository.ensure_indexes()
        await ProductRepository.ensure_indexes()
        await OrderRepository.ensure_indexes()
        await CategoryRepository.ensure_indexes()
        await CartRepository.ensure_indexes()
        await SiteSettingsRepository.ensure_indexes()
        await CampaignRepository.ensure_indexes()
        await ExchangeRequestRepository.ensure_indexes()
        await IntegrationRepository.ensure_indexes()
        await OtpRepository.ensure_indexes()
    except Exception as e:
        logger.error("Index creation failed: %s", e)

    try:
        # Postgres has no TTL-index equivalent to Mongo's expireAfterSeconds --
        # this is best-effort housekeeping, not a security control (see each
        # repo's cleanup_expired docstring).
        await SessionRepository.cleanup_expired()
        await PasswordResetRepository.cleanup_expired()
        await OtpRepository.cleanup_expired()
    except Exception as e:
        logger.error("Expired-record cleanup failed: %s", e)

    try:
        await _seed_role(settings.admin_email, settings.admin_password, "admin")
        await _seed_role(settings.super_admin_email, settings.super_admin_password, "super_admin")
        await UserRepository.backfill_defaults()
    except Exception as e:
        logger.error("User seed/backfill failed: %s", e)

    try:
        await CategoryRepository.ensure_defaults()
        await CategoryRepository.backfill_defaults()
    except Exception as e:
        logger.error("Category seed/backfill failed: %s", e)

    try:
        await ProductRepository.backfill_defaults()
    except Exception as e:
        logger.error("Product backfill failed: %s", e)

    try:
        await CampaignRepository.backfill_defaults()
    except Exception as e:
        logger.error("Campaign backfill failed: %s", e)

    try:
        await SiteSettingsRepository.ensure_defaults()
        await SiteSettingsRepository.backfill_instagram_tiles()
    except Exception as e:
        logger.error("Site settings seed failed: %s", e)

    try:
        from app.models.integration import PROVIDER_CATALOG
        await IntegrationRepository.ensure_defaults(PROVIDER_CATALOG)
        await IntegrationRepository.backfill_defaults(PROVIDER_CATALOG)
        await IntegrationRepository.ensure_provider_exists("email", "smtp", PROVIDER_CATALOG["email"]["smtp"])
    except Exception as e:
        logger.error("Integration catalog seed failed: %s", e)

    global _pending_payment_expiry_task
    _pending_payment_expiry_task = asyncio.create_task(_pending_payment_expiry_loop())


@app.on_event("shutdown")
async def shutdown_db_client():
    if _pending_payment_expiry_task is not None:
        _pending_payment_expiry_task.cancel()
    await database.close()
