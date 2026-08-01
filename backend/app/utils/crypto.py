"""Symmetric encryption for secrets that must be stored reversibly (payment/
shipping provider credentials) rather than one-way hashed like passwords."""
from cryptography.fernet import Fernet

from app.config import settings

_fernet = Fernet(settings.credentials_encryption_key.encode())


def encrypt(value: str) -> str:
    if not value:
        return ""
    return _fernet.encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    if not value:
        return ""
    return _fernet.decrypt(value.encode()).decode()


def mask(value: str) -> str:
    """Reveals only the last 4 characters -- e.g. for a UI showing a
    credential is configured without ever re-sending the real value."""
    if not value:
        return ""
    if len(value) <= 4:
        return "•" * len(value)
    return "•" * (len(value) - 4) + value[-4:]
