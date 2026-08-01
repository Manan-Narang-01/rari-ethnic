import logging

import jwt
from fastapi import HTTPException, status

from app.config import settings
from app.core.google_auth import verify_google_token
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.repositories.otp_repo import OtpRepository
from app.repositories.password_reset_repo import PasswordResetRepository
from app.repositories.session_repo import SessionRepository
from app.repositories.user_repo import UserRepository
from app.services.email_service import EmailService
from app.services.email_templates import otp_email, password_reset_email

logger = logging.getLogger(__name__)


class AuthService:
    @staticmethod
    async def register_customer(name: str, email: str, password: str, phone: str = None) -> dict:
        """Does NOT create a user document -- the pending registration is held
        in the OTP record instead, and the real account is only created once
        verify_registration_otp succeeds. That way an unverified signup never
        occupies the unique email slot or shows up as a real account."""
        email = email.strip().lower()
        if await UserRepository.get_by_email(email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
        registration = {"name": name, "email": email, "password_hash": hash_password(password), "phone": phone}
        await AuthService._send_registration_otp(email, name, registration)
        return {"email": email}

    @staticmethod
    async def _send_registration_otp(email: str, name: str, registration: dict) -> None:
        code = await OtpRepository.create(email, registration)
        # Always logged too, so the flow stays testable before SMTP is configured.
        logger.info("OTP for %s: %s", email, code)
        subject, html = otp_email(name, code)
        await EmailService.send(email, subject, html)

    @staticmethod
    async def resend_registration_otp(email: str) -> None:
        email = email.strip().lower()
        if await UserRepository.get_by_email(email):
            return  # already a real, verified account -- nothing pending to resend
        pending = await OtpRepository.get_pending(email)
        if not pending:
            return  # no pending signup -- don't leak whether the email was ever used
        registration = pending["registration"]
        await AuthService._send_registration_otp(email, registration["name"], registration)

    @staticmethod
    async def verify_registration_otp(email: str, code: str) -> dict:
        registration = await OtpRepository.verify(email, code)
        if not registration:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
        user = await UserRepository.get_by_email(registration["email"])
        if not user:
            user = await UserRepository.create(
                name=registration["name"], email=registration["email"],
                password_hash=registration["password_hash"], role="customer",
                phone=registration.get("phone"), email_verified=True,
            )
        return user

    @staticmethod
    async def authenticate(email: str, password: str) -> dict:
        user = await UserRepository.get_by_email(email)
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if not user.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
        # Only self-registered customers go through OTP verification --
        # admin/super_admin accounts are seeded directly and already trusted.
        if user["role"] == "customer" and not user.get("email_verified", False):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your email before signing in")
        return user

    @staticmethod
    async def issue_tokens(user: dict) -> dict:
        access = create_access_token(user["id"], user["role"])
        refresh, jti, expires_at = create_refresh_token(user["id"], user["role"])
        await SessionRepository.create(jti=jti, user_id=user["id"], expires_at=expires_at)
        return {"access_token": access, "refresh_token": refresh, "token_type": "bearer", "user": user}

    @staticmethod
    async def refresh_tokens(refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

        session = await SessionRepository.get(payload["jti"])
        if not session or session.get("revoked"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked")

        user = await UserRepository.get_by_id(payload["sub"])
        if not user or not user.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

        await SessionRepository.revoke(payload["jti"])  # rotate: one-time-use refresh tokens
        return await AuthService.issue_tokens(user)

    @staticmethod
    async def logout(refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token)
        except jwt.PyJWTError:
            return
        await SessionRepository.revoke(payload.get("jti", ""))

    @staticmethod
    async def request_password_reset(email: str) -> str:
        """Sends the reset email and returns the raw token (kept for local
        testing/logging -- see the route). Silently returns None for unknown
        emails so account existence isn't leaked."""
        user = await UserRepository.get_by_email(email)
        if not user:
            return None
        raw_token = await PasswordResetRepository.create(user_id=user["id"])
        reset_link = f"{settings.frontend_public_url}/reset-password?token={raw_token}"
        subject, html = password_reset_email(user["name"], reset_link)
        await EmailService.send(user["email"], subject, html)
        return raw_token

    @staticmethod
    async def reset_password(raw_token: str, new_password: str) -> None:
        record = await PasswordResetRepository.consume(raw_token)
        if not record:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
        await UserRepository.update_password(record["user_id"], hash_password(new_password))
        await SessionRepository.revoke_all_for_user(record["user_id"])

    @staticmethod
    async def authenticate_google(credential: str) -> dict:
        claims = verify_google_token(credential)
        email = claims.get("email", "").strip().lower()
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account has no email")

        user = await UserRepository.get_by_email(email)
        if user:
            await UserRepository.update_google_profile(
                user["id"], name=claims.get("name"), picture=claims.get("picture"), google_sub=claims.get("sub"),
            )
            user = await UserRepository.get_by_id(user["id"])
        else:
            user = await UserRepository.create(
                name=claims.get("name") or email.split("@")[0], email=email, role="customer",
                email_verified=True, picture=claims.get("picture"), google_sub=claims.get("sub"),
            )
        return user

    @staticmethod
    def dev_login_allowed() -> bool:
        # Enabled explicitly, or automatically while Google isn't configured yet
        # (so the site can be tested end-to-end before OAuth is set up).
        return settings.allow_dev_login or not settings.google_client_id

    @staticmethod
    async def authenticate_dev(email: str, name: str = None) -> dict:
        """Passwordless test login. Only available when Google is not configured
        (or ALLOW_DEV_LOGIN is set) -- see dev_login_allowed."""
        if not AuthService.dev_login_allowed():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Dev login is disabled")
        email = email.strip().lower()
        user = await UserRepository.get_by_email(email)
        if not user:
            user = await UserRepository.create(
                name=name or email.split("@")[0], email=email, role="customer", email_verified=True,
            )
        return user
