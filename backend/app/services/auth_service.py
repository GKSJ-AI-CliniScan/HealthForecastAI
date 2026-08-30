"""Authentication business logic."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rbac import Role, permissions_for
from app.core.security import create_access_token, verify_password
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserLogin


def authenticate_user(db: Session, payload: UserLogin) -> User | None:
    """Find an active user and verify their password."""

    email = str(payload.email).lower()

    statement = select(User).where(User.email == email)
    user = db.scalar(statement)

    if user is None:
        return None

    if not user.is_active:
        return None

    if not verify_password(payload.password, user.hashed_password):
        return None

    return user


def login_user(db: Session, payload: UserLogin) -> Token | None:
    """Authenticate a user, record the attempt and issue a JWT."""

    user = authenticate_user(db, payload)

    if user is None:
        db.add(
            AuditLog(
                actor_id=None,
                actor_role=None,
                action="auth.login",
                resource=str(payload.email),
                outcome="failure",
            )
        )
        db.commit()
        return None

    role = Role(user.role)

    access_token = create_access_token(
        subject=str(user.id),
        role=str(role),
    )

    db.add(
        AuditLog(
            actor_id=user.id,
            actor_role=str(role),
            action="auth.login",
            resource=str(user.id),
            outcome="success",
        )
    )
    db.commit()

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=str(role),
        permissions=permissions_for(role),
    )