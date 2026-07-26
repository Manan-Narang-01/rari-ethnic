from fastapi import APIRouter

from app.api.v1 import (
    admin_campaigns,
    admin_categories,
    admin_exchange_requests,
    admin_misc,
    admin_orders,
    admin_products,
    admin_site_settings,
    auth,
    campaigns,
    cart,
    categories,
    customer_auth,
    exchange_requests,
    files,
    misc,
    orders,
    products,
    site_settings,
    uploads,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(customer_auth.router)
api_router.include_router(products.router)
api_router.include_router(categories.router)
api_router.include_router(orders.router)
api_router.include_router(orders.customer_router)
api_router.include_router(exchange_requests.router)
api_router.include_router(cart.router)
api_router.include_router(misc.router)
api_router.include_router(files.router)
api_router.include_router(site_settings.router)
api_router.include_router(campaigns.router)
api_router.include_router(admin_products.router)
api_router.include_router(admin_categories.router)
api_router.include_router(admin_orders.router)
api_router.include_router(admin_misc.router)
api_router.include_router(admin_site_settings.router)
api_router.include_router(admin_campaigns.router)
api_router.include_router(admin_exchange_requests.router)
api_router.include_router(uploads.router)


@api_router.get("/")
async def root():
    return {"message": "Rari Ethnic API"}
