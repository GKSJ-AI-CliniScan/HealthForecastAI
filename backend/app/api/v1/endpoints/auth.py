from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user
from app.core.rbac import Role, permissions_for
from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.token import Token
from app.schemas.user import UserLogin
from app.services.auth_service import authenticate_user, record_login_attempt

router = APIRouter()


@router.post("/login", response_model=Token, summary="Exchange credentials for a JWT")
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Authenticate a user and issue an access token."""
    user = authenticate_user(db, email=payload.email, password=payload.password)

    record_login_attempt(db, email=payload.email, user=user, success=user is not None)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=str(user.id), role=user.role)

    return Token(
        access_token=access_token,
        role=user.role,
        permissions=permissions_for(Role(user.role)),
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
