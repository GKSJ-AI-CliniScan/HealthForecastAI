"""User Management API endpoints."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserListResponse, UserResponse, UserUpdate
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get(
    "",
    response_model=UserListResponse,
    summary="List Users",
    description="List all platform users with filtering and pagination (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def list_users(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    search: str | None = Query(None, description="Search by name, email or username"),
    role: str | None = Query(None, description="Filter by role name"),
) -> UserListResponse:
    service = UserService(db)
    items, total = service.list_users(page=page, page_size=page_size, search=search, role_name=role)
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    return UserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, total_pages),
    )


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create User",
    description="Create a new user account (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def create_user(
    payload: UserCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    auth_service = AuthService(db)
    user = auth_service.register_user(payload, creator_id=current_user.id)
    return UserResponse.model_validate(user)


@router.get(
    "/doctors",
    response_model=list[UserResponse],
    summary="List Doctors",
    description="Retrieve all active doctors for assignment or filter dropdowns.",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"))],
)
def list_doctors(
    db: Annotated[Session, Depends(get_db)],
) -> list[UserResponse]:
    service = UserService(db)
    return service.list_doctors()


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get User Profile",
    description="Retrieve user profile by ID (SYSTEM_ADMIN or user themselves).",
)
def get_user(
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    if current_user.role != "SYSTEM_ADMIN" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You can only view your own profile",
        )
    service = UserService(db)
    return service.get_user_by_id(user_id)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update User",
    description="Update user account details or status.",
)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    if current_user.role != "SYSTEM_ADMIN" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You can only edit your own profile",
        )
    # Non-admins cannot alter their own role or active status
    if current_user.role != "SYSTEM_ADMIN":
        payload.role_id = None
        payload.role_name = None
        payload.is_active = None

    service = UserService(db)
    return service.update_user(user_id, payload, actor_id=current_user.id)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete User",
    description="Delete a user account (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def delete_user(
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System Administrator cannot delete their own account",
        )
    service = UserService(db)
    service.delete_user(user_id, actor_id=current_user.id)
