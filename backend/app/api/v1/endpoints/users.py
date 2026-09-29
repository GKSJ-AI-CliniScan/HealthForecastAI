"""User management endpoints - Module 1 (System Administrator only)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission, Role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter()

_manage_users = require_permission(Permission.USER_MANAGE)


@router.get("", response_model=list[UserRead], summary="List platform users")
def list_users(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    role: Role | None = Query(default=None),
    db: Session = Depends(get_db),
    usser: CurrentUser = Depends(_manage_users),
) -> list[UserRead]:
    """Return platform users, with optional role filtering and pagination."""
    query = db.query(User)
    if role is not None:
        query = query.filter(User.role == role)
    return query.order_by(User.id).offset(skip).limit(limit).all()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(_manage_users),
) -> UserRead:
    """Create a new platform user."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        department=payload.department,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    db.add(
        AuditLog(
            actor_id=int(user.subject) if user.subject.isdigit() else None,
            actor_role=str(user.role),
            action="user:create",
            resource=new_user.email,
            outcome="success",
        )
    )
    db.commit()

    return new_user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(_manage_users),
) -> UserRead:
    """Update an existing user's role, department, or active status."""
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(target, field, value)

    db.commit()
    db.refresh(target)

    db.add(
        AuditLog(
            actor_id=int(user.subject) if user.subject.isdigit() else None,
            actor_role=str(user.role),
            action="user:update",
            resource=target.email,
            outcome="success",
        )
    )
    db.commit()
    return target


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(_manage_users),
) -> None:
    """Deactivate a user (soft delete - preserves audit history)."""
    target = db.query(User).filter(User.id == user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    target.is_active = False
    db.commit()

    db.add(
        AuditLog(
            actor_id=int(user.subject) if user.subject.isdigit() else None,
            actor_role=str(user.role),
            action="user:deactivate",
            resource=target.email,
            outcome="success",
        )
    )
    db.commit()
