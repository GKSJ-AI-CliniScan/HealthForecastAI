"""auth service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rbac import Role, permissions_for
from app.core.security import create_access_token, verify_password
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserLogin


def authenticate_user(db: Session, payload: UserLogin) -> Token | None:
    """Verify credentials and return a signed token, or None if they are invalid.

    Also writes an audit log entry for both outcomes - never skip the failure
    case, it is what lets a system admin spot a brute-force attempt later.
    """
    stmt = select(User).where(User.email == payload.email)
    user = db.execute(stmt).scalar_one_or_none()

    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.hashed_password)
    ):
        db.add(
            AuditLog(
                actor_id=user.id if user else None,
                actor_role=user.role if user else None,
                action="login",
                resource="auth",
                outcome="failure",
            )
        )
        db.commit()
        return None

    db.add(
        AuditLog(
            actor_id=user.id,
            actor_role=user.role,
            action="login",
            resource="auth",
            outcome="success",
        )
    )
    db.commit()

    role = Role(user.role)
    access_token = create_access_token(subject=user.email, role=str(role))
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=str(role),
        permissions=permissions_for(role),
    )
