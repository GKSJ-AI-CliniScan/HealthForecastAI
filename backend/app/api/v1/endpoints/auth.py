"""Authentication endpoints - Module 1 (User Management)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user
from app.core.config import settings
from app.core.rbac import Role, permissions_for
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserLogin, UserRead
from app.services.auth_service import authenticate_user

router = APIRouter()


@router.post("/login", response_model=Token, summary="Exchange credentials for a JWT")
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Authenticate a user against PostgreSQL and issue an access token."""
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(
        subject=str(user.id),
        role=str(user.role),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        role=str(user.role),
        permissions=permissions_for(Role(user.role)),
        user=UserRead.model_validate(user),
    )


@router.get("/me", summary="Return the authenticated caller and their permissions")
def read_me(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> dict[str, object]:
    """Return the caller's identity, role, email and effective permission list."""
    email = f"{user.subject}@healthforecast.ai" if "@" not in user.subject else user.subject
    full_name = "Healthcare User"
    user_id = 1

    try:
        uid = int(user.subject)
        db_user = db.query(User).filter(User.id == uid).first()
        if db_user:
            user_id = db_user.id
            email = db_user.email
            full_name = db_user.full_name
    except (ValueError, TypeError):
        db_user = db.query(User).filter(User.email == user.subject).first()
        if db_user:
            user_id = db_user.id
            email = db_user.email
            full_name = db_user.full_name

    return {
        "id": user_id,
        "subject": user.subject,
        "email": email,
        "full_name": full_name,
        "role": str(user.role),
        "permissions": permissions_for(user.role),
    }

@router.get("/roles", summary="List the roles supported by the platform")
def list_roles() -> dict[str, list[str]]:
    """Expose the role catalogue and the permissions attached to each role."""
    return {str(role): permissions_for(role) for role in Role}