import logging

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app import database
from app.api.v1.router import api_router
from app.config import settings
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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Rari Ethnic API")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.on_event("shutdown")
async def shutdown_db_client():
    database.close()
