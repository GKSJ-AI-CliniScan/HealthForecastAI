"""Password hashing and JWT helpers."""

from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Compatibility shim for passlib with bcrypt >= 4.1.0
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("about", (), {"__version__": bcrypt.__version__})  # type: ignore[attr-defined]

_bcrypt_hashpw = bcrypt.hashpw


def _safe_bcrypt_hashpw(password: bytes, salt: bytes) -> bytes:
    if isinstance(password, bytes | bytearray) and len(password) > 72:
        password = password[:72]
    return _bcrypt_hashpw(password, salt)


bcrypt.hashpw = _safe_bcrypt_hashpw  # type: ignore[assignment]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash for the given plaintext password."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True when the plaintext password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, role: str, expires_minutes: int | None = None) -> str:
    """Create a signed JWT access token carrying the subject and role claims."""
    expire_delta = timedelta(minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + expire_delta).timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any] | None:
    """Decode a JWT and return its claims, or None when the token is invalid."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
