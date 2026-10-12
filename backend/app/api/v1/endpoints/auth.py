"""Authentication endpoints - Module 1 (User Management)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.rbac import Role, permissions_for
from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.token import Token
from app.schemas.user import UserLogin, UserRead
from app.services import auth_service

router = APIRouter()


@router.post("/login", response_model=Token, summary="Exchange credentials for a JWT")
def login(payload: UserLogin, db: Annotated[Session, Depends(get_db)]) -> Token:
    """Authenticate a user and issue an access token.

    Returns the same message for an unknown email and a wrong password, so the
    endpoint cannot be used to enumerate who has an account.
    """
    user = auth_service.authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role = Role(user.role)
    return Token(
        access_token=create_access_token(subject=str(user.id), role=str(role)),
        role=str(role),
        permissions=permissions_for(role),
    )


@router.get("/me", response_model=UserRead, summary="Return the authenticated caller")
def read_me(user: CurrentUser) -> UserRead:
    """Return the caller's own record."""
    return UserRead.model_validate(user)


@router.get("/permissions", summary="Effective permissions for the caller")
def read_my_permissions(user: CurrentUser) -> dict[str, object]:
    """Return the caller's role and the permissions it grants.

    The frontend uses this to decide which navigation items to render. It is a
    convenience, not a security boundary - every endpoint authorises on its own.
    """
    role = Role(user.role)
    return {
        "user_id": user.id,
        "role": str(role),
        "permissions": permissions_for(role),
    }


@router.get("/roles", summary="List the roles supported by the platform")
def list_roles() -> dict[str, list[str]]:
    """Expose the role catalogue and the permissions attached to each role."""
    return {str(role): permissions_for(role) for role in Role}
