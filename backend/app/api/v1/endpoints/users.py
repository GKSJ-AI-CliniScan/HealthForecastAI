"""User management endpoints - Module 1 (System Administrator only)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.user import UserCreate, UserRead
from app.services.user_service import create_user, email_taken
from app.services.user_service import list_users as list_users_service

router = APIRouter()

_manage_users = require_permission(Permission.USER_MANAGE)


@router.get("", response_model=list[UserRead], summary="List platform users")
def list_users(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(_manage_users),
) -> list[UserRead]:
    """Return every platform user."""
    return list_users_service(db)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_new_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(_manage_users),
) -> UserRead:
    """Create a new platform user."""
    if email_taken(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    return create_user(db, payload)
