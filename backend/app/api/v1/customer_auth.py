from fastapi import APIRouter

from app.config import settings
from app.core.security import create_access_token
from app.schemas.auth import CustomerTokenResponse, DevLoginRequest, GoogleAuthPayload
from app.services.auth_service import AuthService

router = APIRouter(prefix="/customer", tags=["customer-auth"])


def _customer_out(user: dict) -> dict:
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "picture": user.get("picture"), "role": user.get("role", "customer"),
    }


def _token_response(user: dict) -> dict:
    token = create_access_token(user["id"], "customer")
    return {"access_token": token, "token_type": "bearer", "customer": _customer_out(user)}


@router.post("/google", response_model=CustomerTokenResponse)
async def customer_google_login(payload: GoogleAuthPayload):
    user = await AuthService.authenticate_google(payload.credential)
    return _token_response(user)


@router.post("/dev-login", response_model=CustomerTokenResponse)
async def customer_dev_login(payload: DevLoginRequest):
    user = await AuthService.authenticate_dev(payload.email, payload.name)
    return _token_response(user)


@router.get("/auth-config")
async def customer_auth_config():
    return {
        "google_enabled": bool(settings.google_client_id),
        "dev_login_enabled": AuthService.dev_login_allowed(),
    }
