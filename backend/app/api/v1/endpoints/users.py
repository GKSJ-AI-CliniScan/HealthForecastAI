"""User management endpoints - Module 1 (System Administrator only)."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.schemas.user import UserCreate, UserRead

router = APIRouter()

_manage_users = require_permission(Permission.USER_MANAGE)


@router.get("", response_model=list[UserRead], summary="List platform users")
def list_users(user: CurrentUser = Depends(_manage_users)) -> list[UserRead]:
    """Return every platform user.

    TODO(milestone-1): read from PostgreSQL with pagination and filtering.
    """
    return []


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate, user: CurrentUser = Depends(_manage_users)
) -> UserRead:
    """Create a new platform user.

    TODO(milestone-1): hash the password, persist the row, write an audit log entry.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="User creation is not implemented yet - see TODO(milestone-1)",
    )
