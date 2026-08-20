"""Authentication endpoints - Module 1 (User Management).

Milestone 1 owner: wire these to the users table via app/services/auth_service.py.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, get_current_user
from app.core.rbac import Role, permissions_for
from app.schemas.token import Token
from app.schemas.user import UserLogin

router = APIRouter()


@router.post("/login", response_model=Token, summary="Exchange credentials for a JWT")
def login(payload: UserLogin) -> Token:
    """Authenticate a user and issue an access token.

    TODO(milestone-1): look the user up in PostgreSQL, verify the bcrypt hash
    with app.core.security.verify_password and record the attempt in audit_logs.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Login is not implemented yet - see TODO(milestone-1) in auth.py",
    )


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
