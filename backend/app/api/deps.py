"""Shared FastAPI dependencies for authentication and role-based access control.

Unlike the old admin-only scheme (which trusted whatever role was embedded in
the JWT), every protected request re-reads the user from the database. That
costs one extra query per request but means deactivating a user or changing
their role takes effect immediately instead of waiting for their token to
expire.
"""
import jwt
from fastapi import Depends, HTTPException, Request, status

from app.core.security import decode_token
from app.repositories.user_repo import UserRepository


async def _decode_bearer(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = auth[7:]
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    return payload


async def get_current_user(request: Request) -> dict:
    payload = await _decode_bearer(request)
    user = await UserRepository.get_by_id(payload["sub"])
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def get_current_user_optional(request: Request) -> dict:
    """Like get_current_user, but returns None instead of raising when no/invalid
    token is present. Used by endpoints that work for both guests and logged-in
    users (e.g. checkout)."""
    if not request.headers.get("Authorization", "").startswith("Bearer "):
        return None
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def require_roles(*roles: str):
    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return dependency


require_customer = require_roles("customer")
require_admin = require_roles("admin", "super_admin")
require_super_admin = require_roles("super_admin")
