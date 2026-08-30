"""Auth token schemas."""

from pydantic import BaseModel, Field


class Token(BaseModel):
    """Bearer token returned after a successful login."""

    access_token: str
    token_type: str = "bearer"
    role: str
    permissions: list[str] = Field(default_factory=list)


class TokenPayload(BaseModel):
    """Decoded JWT claims."""

    sub: str | None = None
    role: str | None = None
    exp: int | None = None
