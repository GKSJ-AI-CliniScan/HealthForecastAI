"""User management endpoints - Module 1 (System Administrator only)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.services import auth_service

router = APIRouter()

ManageUsers = Annotated[User, Depends(require_permission(Permission.USER_MANAGE))]
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[UserRead], summary="List platform users")
def list_users(
    actor: ManageUsers,
    db: DbSession,
    role: Role | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[UserRead]:
    """Return platform users, optionally filtered by role."""
    users = auth_service.list_users(db, role=role, limit=limit, offset=offset)
    return [UserRead.model_validate(user) for user in users]


@router.post(
    "", response_model=UserRead, status_code=status.HTTP_201_CREATED, summary="Create a user"
)
def create_user(payload: UserCreate, actor: ManageUsers, db: DbSession) -> UserRead:
    """Create a new platform user. The password is bcrypt hashed before storage."""
    try:
        user = auth_service.create_user(db, payload, actor=actor)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return UserRead.model_validate(user)


@router.get("/{user_id}", response_model=UserRead, summary="Fetch one user")
def get_user(user_id: int, actor: ManageUsers, db: DbSession) -> UserRead:
    """Return a single user by id."""
    user = auth_service.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserRead.model_validate(user)


@router.post("/{user_id}/deactivate", response_model=UserRead, summary="Deactivate a user")
def deactivate_user(user_id: int, actor: ManageUsers, db: DbSession) -> UserRead:
    """Deactivate a user.

    Users are deactivated, never deleted: audit log entries reference the actor,
    and a clinical system has to keep that trail intact.
    """
    if user_id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )
    user = auth_service.set_user_active(db, user_id, active=False, actor=actor)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserRead.model_validate(user)


@router.post("/{user_id}/activate", response_model=UserRead, summary="Reactivate a user")
def activate_user(user_id: int, actor: ManageUsers, db: DbSession) -> UserRead:
    """Reactivate a previously deactivated user."""
    user = auth_service.set_user_active(db, user_id, active=True, actor=actor)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserRead.model_validate(user)
