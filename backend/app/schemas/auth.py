"""Authentication schemas."""

import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """Payload for username/email password login."""
    username_or_email: str = Field(..., description="User email or username")
    password: str = Field(..., description="User plaintext password")


class RefreshTokenRequest(BaseModel):
    """Payload for refreshing an expired access token."""
    refresh_token: str = Field(..., description="Valid JWT refresh token")


class TokenResponse(BaseModel):
    """JWT access and refresh token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RoleResponse(BaseModel):
    """Role information schema."""
    id: uuid.UUID
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserMeResponse(BaseModel):
    """Current authenticated user profile schema."""
    id: uuid.UUID
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    full_name: str
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
