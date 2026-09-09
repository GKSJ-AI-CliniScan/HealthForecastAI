"""Auth service - business logic layer for authentication and user management."""

from sqlalchemy.orm import Session
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Look up user by email in PostgreSQL and verify password hash."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_user(db: Session, user_in: UserCreate) -> User:
    """Create a new platform user with hashed password and audit log."""
    hashed_pwd = hash_password(user_in.password)
    db_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_pwd,
        role=user_in.role,
        department=user_in.department,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Record security audit log
    audit = AuditLog(
        actor_id=db_user.id,
        actor_role=str(db_user.role),
        action="user_registered",
        resource=f"user:{db_user.id}",
        outcome="success",
    )
    db.add(audit)
    db.commit()

    return db_user
