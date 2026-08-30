"""auth service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.
"""

from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.audit_log import AuditLog
from app.models.user import User


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Look up a user by email and verify their password."""
    user = db.query(User).filter(User.email == email).first()

    if user is None or not user.is_active:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def record_login_attempt(
    db: Session,
    *,
    email: str,
    user: User | None,
    success: bool,
) -> None:
    """Write an audit_logs row for a login attempt."""
    entry = AuditLog(
        actor_id=user.id if user else None,
        actor_role=user.role if user else None,
        action="auth:login",
        resource=email,
        outcome="success" if success else "failure",
    )
    db.add(entry)
    db.commit()
