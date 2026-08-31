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


class UserRegister(BaseModel):
    """Self service registration payload.

    Carries no role field on purpose: the role is decided by the server, never by
    the caller, so a registration request cannot ask for elevated privileges.
    """

    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    department: str | None = None


class UserLogin(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Partial update applied by a system administrator.

    Every field is optional and the endpoint serialises with exclude_unset, so a
    field the caller omits keeps its stored value rather than being blanked.
    Assigning ``role`` is how a user is moved between roles.
    """

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    department: str | None = None
    role: Role | None = None
    is_active: bool | None = None


class UserRead(UserBase):
    """User representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime | None = None
