"""Pydantic schemas for authentication and user management.

Validation happens here rather than inside the endpoints so that a malformed
request is rejected before any database work starts, and so the rules appear in
the generated OpenAPI documentation.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.rbac import Role

VALID_ROLES = frozenset(str(role) for role in Role)


class LoginRequest(BaseModel):
    """Credentials submitted to the login endpoint."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        """Lowercase and trim the address so lookups are case insensitive."""
        return value.lower().strip()


class UserCreate(BaseModel):
    """Payload for creating a platform account. Restricted to system admins."""

    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default=str(Role.DOCTOR))
    department: str | None = Field(default=None, max_length=128)

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        """Lowercase and trim the address before it is stored."""
        return value.lower().strip()

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, value: str) -> str:
        """Require a mix of letters and digits.

        Clinical systems hold identifiable data, so a length check alone is a
        weak barrier against the passwords people actually choose.
        """
        if not any(character.isalpha() for character in value):
            raise ValueError("Password must contain at least one letter.")
        if not any(character.isdigit() for character in value):
            raise ValueError("Password must contain at least one digit.")
        return value

    @field_validator("role")
    @classmethod
    def check_role(cls, value: str) -> str:
        """Reject any role outside the four defined in the access matrix."""
        normalised = value.strip().lower()
        if normalised not in VALID_ROLES:
            allowed = ", ".join(sorted(VALID_ROLES))
            raise ValueError(f"Invalid role '{value}'. Allowed roles: {allowed}.")
        return normalised


class UserRead(BaseModel):
    """A user record as returned by the API. Never includes the password hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: str
    department: str | None
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    """A successful login response."""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserRead


class RoleInfo(BaseModel):
    """A role and the permissions it grants, used by the frontend to shape the UI."""

    role: str
    permissions: list[str]
