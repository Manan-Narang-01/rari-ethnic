import jwt
from fastapi import HTTPException, status

from app.config import settings
from app.core.google_auth import verify_google_token
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.repositories.password_reset_repo import PasswordResetRepository
from app.repositories.session_repo import SessionRepository
from app.repositories.user_repo import UserRepository


class AuthService:
    @staticmethod
    async def register_customer(name: str, email: str, password: str, phone: str = None) -> dict:
        if await UserRepository.get_by_email(email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
        return await UserRepository.create(name=name, email=email, password_hash=hash_password(password),
                                            role="customer", phone=phone)

    @staticmethod
    async def authenticate(email: str, password: str) -> dict:
        user = await UserRepository.get_by_email(email)
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        if not user.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
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
    async def change_password(user: dict, current_password: str, new_password: str) -> None:
        if not verify_password(current_password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
        await UserRepository.update_password(user["id"], hash_password(new_password))
        await SessionRepository.revoke_all_for_user(user["id"])

    @staticmethod
    async def request_password_reset(email: str) -> str:
        """Returns the raw reset token so the caller can email it. Silently
        returns None for unknown emails so account existence isn't leaked."""
        user = await UserRepository.get_by_email(email)
        if not user:
            return None
        return await PasswordResetRepository.create(user_id=user["id"])

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
