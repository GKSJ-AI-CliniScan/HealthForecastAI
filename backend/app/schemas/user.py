"""User schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    """Base user fields."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=64)
    first_name: str = Field(..., min_length=1, max_length=128)
    last_name: str = Field(..., min_length=1, max_length=128)


class UserCreate(UserBase):
    """User creation schema with role ID or role name and initial password."""
    password: str = Field(..., min_length=8)
    role_id: uuid.UUID | None = None
    role_name: str | None = None


class UserUpdate(BaseModel):
    """User update schema."""
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    role_id: uuid.UUID | None = None
    role_name: str | None = None
    is_active: bool | None = None
    password: str | None = None


class UserResponse(UserBase):
    """User profile response."""
    id: uuid.UUID
    role_id: uuid.UUID
    role: str
    full_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Paginated list of users."""
    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
