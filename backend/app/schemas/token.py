"""Auth token schemas."""

from pydantic import BaseModel

from app.schemas.user import UserRead


class Token(BaseModel):
    """Bearer token returned after a successful login."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int = 30
    role: str
    permissions: list[str] = []
    user: UserRead | None = None


class TokenPayload(BaseModel):
    """Decoded JWT claims."""

    sub: str | None = None
    role: str | None = None
    exp: int | None = None