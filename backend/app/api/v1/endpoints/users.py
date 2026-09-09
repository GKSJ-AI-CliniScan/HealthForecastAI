"""User management endpoints - Module 1 (System Administrator only)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.services.auth_service import create_user as create_user_service

router = APIRouter()

_manage_users = require_permission(Permission.USER_MANAGE)


@router.get("", response_model=list[UserRead], summary="List platform users")
def list_users(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(_manage_users)
) -> list[UserRead]:
    """Return every platform user from PostgreSQL."""
    return db.query(User).all()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(_manage_users)
) -> UserRead:
    """Create a new platform user in PostgreSQL."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )
    return create_user_service(db, payload)
