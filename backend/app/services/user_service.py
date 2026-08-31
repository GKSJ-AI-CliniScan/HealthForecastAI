"""User management business logic."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.user import UserCreate


def list_users(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    role: Role | None = None,
) -> list[User]:
    """Return platform users with pagination and optional role filtering."""

    statement = select(User).order_by(User.id).offset(skip).limit(limit)

    if role is not None:
        statement = statement.where(User.role == str(role))

    return list(db.scalars(statement).all())


def create_user(
    db: Session,
    payload: UserCreate,
    *,
    actor_id: int,
    actor_role: str,
) -> User:
    """Create a user and record the administrative action."""

    email = str(payload.email).lower()

    existing_user = db.scalar(select(User).where(User.email == email))

    if existing_user is not None:
        raise ValueError("A user with this email already exists")

    user = User(
        email=email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=str(payload.role),
        department=payload.department,
        is_active=True,
    )

    db.add(user)
    db.flush()

    db.add(
        AuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            action="user.create",
            resource=str(user.id),
            outcome="success",
        )
    )

    db.commit()
    db.refresh(user)

    return user
