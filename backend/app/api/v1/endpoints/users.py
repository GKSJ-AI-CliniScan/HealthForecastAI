"""User management endpoints - Module 1 (System Administrator only)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.core.security import hash_password
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.user import UserCreate, UserRead


router = APIRouter()

_manage_users = require_permission(Permission.USER_MANAGE)


@router.get(
    "",
    response_model=list[UserRead],
    summary="List platform users",
)
def list_users(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    role: str | None = Query(default=None),
    email: str | None = Query(default=None),
    user: CurrentUser = Depends(_manage_users),
    db: Session = Depends(get_db),
) -> list[UserRead]:
    """Return platform users with pagination and optional filtering."""

    stmt = select(User)

    if role:
        stmt = stmt.where(User.role == role)

    if email:
        stmt = stmt.where(
            User.email.ilike(f"%{email}%")
        )

    stmt = (
        stmt
        .order_by(User.id)
        .limit(limit)
        .offset(offset)
    )

    return list(db.scalars(stmt).all())


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a platform user",
)
def create_user(
    payload: UserCreate,
    user: CurrentUser = Depends(_manage_users),
    db: Session = Depends(get_db),
) -> UserRead:
    """Create a new platform user."""

    existing = db.scalar(
        select(User).where(
            User.email == str(payload.email)
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    new_user = User(
        email=str(payload.email),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=str(payload.role),
        department=payload.department,
        is_active=True,
    )

    db.add(new_user)
    db.flush()

    audit = AuditLog(
        actor_id=int(user.subject),
        actor_role=str(user.role),
        action="user.create",
        resource=f"user:{new_user.id}",
        outcome="success",
    )

    db.add(audit)
    db.commit()
    db.refresh(new_user)

    return new_user