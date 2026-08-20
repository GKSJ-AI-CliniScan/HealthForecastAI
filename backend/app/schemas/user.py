"""User schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.rbac import Role


class UserBase(BaseModel):
    """Fields common to every user representation."""

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    role: Role = Role.DOCTOR
    department: str | None = None


class UserCreate(UserBase):
    """Payload accepted when a system administrator creates a user."""

    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str


class UserRead(UserBase):
    """User representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime | None = None
