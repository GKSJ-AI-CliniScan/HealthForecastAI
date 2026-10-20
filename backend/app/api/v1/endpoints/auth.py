"""Authentication endpoints - Module 1 (User Management)."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, get_current_user
from app.core.rbac import Role, permissions_for
from app.core.security import create_access_token
from app.schemas.token import Token
from app.schemas.user import UserLogin
from app.services import auth_service

router = APIRouter()


@router.post("/login", response_model=Token, summary="Exchange credentials for a JWT")
def login(payload: UserLogin) -> Token:
    """Authenticate a user and issue an access token.

    Every attempt, successful or not, is written to the audit trail. The error
    message is the same for an unknown e-mail and a wrong password.
    """
    user = auth_service.authenticate(payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect e-mail or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=str(user.id), role=str(user.role))
    return Token(access_token=token, role=str(user.role), permissions=permissions_for(user.role))


@router.get("/me", summary="Return the authenticated caller and their permissions")
def read_me(user: CurrentUser = Depends(get_current_user)) -> dict[str, object]:
    """Return the caller's identity, role and effective permission list."""
    return {
        "subject": user.subject,
        "role": str(user.role),
        "permissions": permissions_for(user.role),
    }


@router.get("/roles", summary="List the roles supported by the platform")
def list_roles() -> dict[str, list[str]]:
    """Expose the role catalogue and the permissions attached to each role."""
    return {str(role): permissions_for(role) for role in Role}
