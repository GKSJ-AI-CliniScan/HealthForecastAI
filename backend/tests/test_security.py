"""Tests for password hashing and JWT handling."""

from app.core.rbac import Role
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    """A hashed password verifies against its plaintext and nothing else."""
    hashed = hash_password("Str0ng-Passw0rd!")
    assert hashed != "Str0ng-Passw0rd!"
    assert verify_password("Str0ng-Passw0rd!", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_roundtrip() -> None:
    """A freshly issued token decodes back to its claims."""
    token = create_access_token(subject="42", role=str(Role.DOCTOR))
    claims = decode_token(token)
    assert claims is not None
    assert claims["sub"] == "42"
    assert claims["role"] == "doctor"


def test_tampered_token_is_rejected() -> None:
    """A token with a broken signature decodes to None rather than raising."""
    token = create_access_token(subject="42", role=str(Role.DOCTOR))
    assert decode_token(token + "tampered") is None


def test_expired_token_is_rejected() -> None:
    """An already expired token is not accepted."""
    token = create_access_token(subject="42", role=str(Role.DOCTOR), expires_minutes=-1)
    assert decode_token(token) is None
