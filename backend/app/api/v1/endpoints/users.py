"""User management endpoints - Module 1 (System Administrator only)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.schemas.user import UserCreate, UserRead
from app.services.user_service import create_user as create_user_service
from app.services.user_service import list_users as list_users_service

router = APIRouter()

_manage_users = require_permission(Permission.USER_MANAGE)


@router.get("", response_model=list[UserRead], summary="List platform users")
def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    role: Role | None = Query(default=None),
    user: CurrentUser = Depends(_manage_users),
    db: Session = Depends(get_db),
) -> list[UserRead]:
    """Return platform users with pagination and optional role filtering."""

    users = list_users_service(
        db,
        skip=skip,
        limit=limit,
        role=role,
    )

    return [UserRead.model_validate(item) for item in users]


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    user: CurrentUser = Depends(_manage_users),
    db: Session = Depends(get_db),
) -> UserRead:
    """Create a new platform user."""

    try:
        created_user = create_user_service(
            db,
            payload,
            actor_id=int(user.subject),
            actor_role=str(user.role),
        )

        return UserRead.model_validate(created_user)

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
