"""Authentication business logic."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.audit_log import AuditLog
from app.models.user import User


def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User | None:
    """Find an active user and verify their password."""

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if user is None:
        return None

    if not user.is_active:
        return None

    if not verify_password(
        password,
        user.hashed_password,
    ):
        return None

    return user


def record_login_attempt(
    db: Session,
    user: User | None,
    email: str,
    success: bool,
) -> None:
    """Record a login attempt in the audit log."""

    audit = AuditLog(
        actor_id=user.id if user else None,
        actor_role=user.role if user else None,
        action="user.login",
        resource=email,
        outcome="success" if success else "failure",
    )

    db.add(audit)
    db.commit()