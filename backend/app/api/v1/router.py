from fastapi import APIRouter

from app.api.v1 import admin_misc, admin_orders, admin_products, auth, customer_auth, files, misc, orders, products, uploads

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(customer_auth.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
api_router.include_router(misc.router)
api_router.include_router(files.router)
api_router.include_router(admin_products.router)
api_router.include_router(admin_orders.router)
api_router.include_router(admin_misc.router)
api_router.include_router(uploads.router)


@api_router.get("/")
async def root():
    return {"message": "Rari Ethnic API"}
