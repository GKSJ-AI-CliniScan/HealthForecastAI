"""User management endpoints - Module 1 (System Administrator only)."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.auth_service import EmailAlreadyRegisteredError
from app.services.user_service import (
    LastAdministratorError,
    UnknownFieldError,
    UserNotFoundError,
    UserService,
)

router = APIRouter()

_manage_users = require_permission(Permission.USER_MANAGE)


def _not_found(user_id: int) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No user with id {user_id}")


@router.get("", response_model=list[UserRead], summary="List platform users")
def list_users(
    response: Response,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    role: Role | None = Query(default=None, description="Filter by role"),
    is_active: bool | None = Query(default=None, description="Filter by account status"),
    user: CurrentUser = Depends(_manage_users),
    db: Session = Depends(get_db),
) -> list[UserRead]:
    """Return a page of platform users.

    The total matching the current filters is returned in the X-Total-Count
    header so the client can paginate without a second endpoint.
    """
    rows, total = UserService(db).list_users(
        limit=limit, offset=offset, role=role, is_active=is_active
    )
    response.headers["X-Total-Count"] = str(total)
    return [UserRead.model_validate(row) for row in rows]


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    user: CurrentUser = Depends(_manage_users),
    db: Session = Depends(get_db),
) -> UserRead:
    """Create a new platform user with the role the administrator chose."""
    try:
        created = UserService(db).create_user(
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
            role=payload.role,
            department=payload.department,
            actor_id=user.user_id,
            actor_role=str(user.role),
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email address is already registered",
        ) from exc
    return UserRead.model_validate(created)


@router.get("/{user_id}", response_model=UserRead, summary="Read one user")
def get_user(
    user_id: int,
    user: CurrentUser = Depends(_manage_users),
    db: Session = Depends(get_db),
) -> UserRead:
    """Return a single user record."""
    try:
        record = UserService(db).get_user(user_id)
    except UserNotFoundError as exc:
        raise _not_found(user_id) from exc
    return UserRead.model_validate(record)


@router.patch("/{user_id}", response_model=UserRead, summary="Update a user or assign a role")
def update_user(
    user_id: int,
    payload: UserUpdate,
    user: CurrentUser = Depends(_manage_users),
    db: Session = Depends(get_db),
) -> UserRead:
    """Apply a partial update, including moving the user to a different role.

    Only the fields present in the request body are changed. Removing the last
    active system administrator is refused with a 409, because no one could reach
    these endpoints afterwards.
    """
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one field to update",
        )

    try:
        updated = UserService(db).update_user(
            user_id=user_id,
            changes=changes,
            actor_id=user.user_id,
            actor_role=str(user.role),
        )
    except UserNotFoundError as exc:
        raise _not_found(user_id) from exc
    except LastAdministratorError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot remove the last active system administrator",
        ) from exc
    except UnknownFieldError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown field: {exc}"
        ) from exc
    return UserRead.model_validate(updated)
