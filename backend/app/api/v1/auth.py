import logging

from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_user
from app.core.rate_limit import limiter
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    ResendOtpRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
    VerifyOtpRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=RegisterResponse)
@limiter.limit("20/minute")
async def register(request: Request, payload: RegisterRequest):
    user = await AuthService.register_customer(payload.name, payload.email, payload.password, payload.phone)
    return {"message": "Check your email for a verification code.", "email": user["email"]}


@router.post("/verify-otp", response_model=TokenResponse)
@limiter.limit("10/minute")
async def verify_otp(request: Request, payload: VerifyOtpRequest):
    user = await AuthService.verify_registration_otp(payload.email, payload.code)
    return await AuthService.issue_tokens(user)


@router.post("/resend-otp")
@limiter.limit("5/minute")
async def resend_otp(request: Request, payload: ResendOtpRequest):
    await AuthService.resend_registration_otp(payload.email)
    return {"message": "If that account needs verifying, a new code has been sent."}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest):
    user = await AuthService.authenticate(payload.email, payload.password)
    return await AuthService.issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest):
    return await AuthService.refresh_tokens(payload.refresh_token)


@router.post("/logout")
async def logout(payload: LogoutRequest):
    await AuthService.logout(payload.refresh_token)
    return {"logged_out": True}


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, payload: ForgotPasswordRequest):
    raw_token = await AuthService.request_password_reset(payload.email)
    # No email/SMS provider is wired up yet (see roadmap phase on notifications) --
    # log the token so it can be tested locally. Never do this in production.
    if raw_token:
        logger.info("Password reset token for %s: %s", payload.email, raw_token)
    # Always return 200 regardless of whether the email existed, to avoid
    # leaking account existence via response differences.
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(request: Request, payload: ResetPasswordRequest):
    await AuthService.reset_password(payload.token, payload.new_password)
    return {"reset": True}
