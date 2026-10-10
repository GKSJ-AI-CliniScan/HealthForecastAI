"""user service - business logic layer for platform user management."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.user import UserCreate


def list_users(db: Session, limit: int = 100, offset: int = 0) -> list[User]:
    """Return a page of platform users."""
    stmt = select(User).order_by(User.id).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def email_taken(db: Session, email: str) -> bool:
    """Return True when a user with this email already exists."""
    stmt = select(User.id).where(User.email == email)
    return db.execute(stmt).scalar_one_or_none() is not None


def create_user(db: Session, payload: UserCreate, actor_id: int | None = None) -> User:
    """Hash the password, insert the row, and write an audit log entry."""
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=str(payload.role),
        department=payload.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(
        AuditLog(
            actor_id=actor_id,
            actor_role=str(payload.role),
            action="user_create",
            resource=f"user:{user.id}",
            outcome="success",
        )
    )
    db.commit()
    return user
