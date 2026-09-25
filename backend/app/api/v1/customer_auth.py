from fastapi import APIRouter, Request

from app.config import settings
from app.core.rate_limit import limiter
from app.schemas.auth import CustomerTokenResponse, DevLoginRequest, GoogleAuthPayload
from app.services.auth_service import AuthService

router = APIRouter(prefix="/customer", tags=["customer-auth"])


def _customer_out(user: dict) -> dict:
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "picture": user.get("picture"), "role": user.get("role", "customer"),
    }


async def _token_response(user: dict) -> dict:
    # Issues a real access+refresh pair (with a tracked session, so it can be
    # rotated/revoked) rather than a bare access token -- previously Google/
    # dev-login customers got no refresh token at all and hard-expired after
    # ACCESS_TOKEN_EXPIRE_MINUTES with no way to renew, unlike password-login
    # customers. This also derives the JWT's role claim from the actual user
    # record instead of hardcoding "customer", which was a latent bug for an
    # admin/super_admin who signs in via their Google-linked email.
    tokens = await AuthService.issue_tokens(user)
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer",
        "customer": _customer_out(user),
    }


@router.post("/google", response_model=CustomerTokenResponse)
@limiter.limit("20/minute")
async def customer_google_login(request: Request, payload: GoogleAuthPayload):
    user = await AuthService.authenticate_google(payload.credential)
    return await _token_response(user)


@router.post("/dev-login", response_model=CustomerTokenResponse)
@limiter.limit("10/minute")
async def customer_dev_login(request: Request, payload: DevLoginRequest):
    user = await AuthService.authenticate_dev(payload.email, payload.name)
    return await _token_response(user)


@router.get("/auth-config")
async def customer_auth_config():
    return {
        "google_enabled": bool(settings.google_client_id),
        "dev_login_enabled": AuthService.dev_login_allowed(),
    }
