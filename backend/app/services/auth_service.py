"""Authentication and user management business logic.

Milestone 1. Routers stay thin: they validate and authorise, this module does
the work and records what happened in the audit log.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import hash_password, verify_password
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.user import UserCreate


def record_audit(
    db: Session,
    action: str,
    actor_id: int | None = None,
    actor_role: str | None = None,
    resource: str | None = None,
    outcome: str = "success",
) -> None:
    """Append an entry to the audit log.

    Never raises: a failure to audit must not take the request down with it, but
    it must be visible, so the caller commits and any error surfaces in the log.
    """
    db.add(
        AuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            action=action,
            resource=resource,
            outcome=outcome,
        )
    )


def audit_read(db: Session, actor: User, action: str, resource: str | None = None) -> None:
    """Record that a user read patient data, and commit it.

    A clinical system has to be able to answer "who looked at this record?" and
    that cannot be reconstructed afterwards. Reads are logged at the point of
    access, not inferred from web server logs that know nothing about patients.
    """
    record_audit(db, action, actor.id, actor.role, resource)
    db.commit()


def get_user_by_email(db: Session, email: str) -> User | None:
    """Look a user up by email, case-insensitively."""
    stmt = select(User).where(func.lower(User.email) == email.strip().lower())
    return db.execute(stmt).scalar_one_or_none()


def get_user(db: Session, user_id: int) -> User | None:
    """Look a user up by primary key."""
    return db.get(User, user_id)


MAX_FAILED_LOGINS = 5
LOCKOUT_WINDOW = timedelta(minutes=15)


class TooManyAttemptsError(Exception):
    """Raised when an account has had too many recent failed sign-ins."""

    def __init__(self, retry_after_seconds: int) -> None:
        super().__init__("Too many failed sign-in attempts")
        self.retry_after_seconds = retry_after_seconds


def check_lockout(db: Session, email: str) -> None:
    """Refuse a sign-in attempt after too many recent failures for this address.

    Counted from the audit log rather than process memory, so the limit holds
    across several API instances and survives a restart. Failures before the most
    recent success do not count. Unknown addresses are counted too: otherwise the
    lockout itself would reveal which addresses have an account.

    The trade-off is deliberate: anyone can lock a known address out for the
    window. For a clinical system that is preferable to unlimited password
    guessing, and the audit trail shows who was locked out and when.
    """
    address = email.strip().lower()
    since = datetime.now(UTC) - LOCKOUT_WINDOW

    last_success = db.execute(
        select(func.max(AuditLog.created_at)).where(
            AuditLog.action == "auth.login",
            AuditLog.outcome == "success",
            func.lower(AuditLog.resource) == address,
        )
    ).scalar_one()
    if last_success is not None and last_success.replace(tzinfo=None) > since.replace(tzinfo=None):
        since = last_success

    failures = list(
        db.execute(
            select(AuditLog.created_at)
            .where(
                AuditLog.action == "auth.login",
                AuditLog.outcome.in_(("failure", "inactive")),
                func.lower(AuditLog.resource) == address,
                AuditLog.created_at > since,
            )
            .order_by(AuditLog.created_at)
        ).scalars()
    )
    if len(failures) >= MAX_FAILED_LOGINS:
        oldest_counted = failures[-MAX_FAILED_LOGINS]
        release = oldest_counted.replace(tzinfo=None) + LOCKOUT_WINDOW
        wait = int((release - datetime.now(UTC).replace(tzinfo=None)).total_seconds())
        record_audit(db, "auth.lockout", resource=address, outcome="failure")
        db.commit()
        raise TooManyAttemptsError(max(wait, 1))


def authenticate(db: Session, email: str, password: str) -> User | None:
    """Return the user when the credentials are valid, otherwise None.

    Both the unknown-email and wrong-password paths run a hash comparison so the
    response time does not reveal whether an account exists.
    """
    check_lockout(db, email)
    user = get_user_by_email(db, email)

    if user is None:
        # Compare against a dummy hash so this path costs the same as a real one.
        verify_password(password, hash_password("timing-equalising-placeholder"))
        record_audit(db, "auth.login", resource=email, outcome="failure")
        db.commit()
        return None

    if not verify_password(password, user.hashed_password):
        record_audit(db, "auth.login", user.id, user.role, email, "failure")
        db.commit()
        return None

    if not user.is_active:
        record_audit(db, "auth.login", user.id, user.role, email, "inactive")
        db.commit()
        return None

    record_audit(db, "auth.login", user.id, user.role, email, "success")
    db.commit()
    return user


def create_user(db: Session, payload: UserCreate, actor: User | None = None) -> User:
    """Create a platform user. Raises ValueError when the email is taken."""
    if get_user_by_email(db, payload.email) is not None:
        raise ValueError(f"A user with email {payload.email} already exists")

    user = User(
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=str(payload.role),
        department=payload.department,
        is_active=True,
    )
    db.add(user)
    db.flush()

    record_audit(
        db,
        "user.create",
        actor.id if actor else None,
        actor.role if actor else None,
        f"user:{user.id}",
    )
    db.commit()
    db.refresh(user)
    return user


def list_users(
    db: Session, role: Role | None = None, limit: int = 100, offset: int = 0
) -> list[User]:
    """Return a page of users, optionally filtered by role."""
    stmt = select(User).order_by(User.id).limit(limit).offset(offset)
    if role is not None:
        stmt = stmt.where(User.role == str(role))
    return list(db.execute(stmt).scalars().all())


def count_users(db: Session) -> int:
    """Return the total number of users."""
    return db.execute(select(func.count()).select_from(User)).scalar_one()


def set_user_active(db: Session, user_id: int, active: bool, actor: User) -> User | None:
    """Activate or deactivate a user.

    Deactivation is used instead of deletion: audit log entries reference the
    actor, and a clinical system must keep that trail intact.
    """
    user = db.get(User, user_id)
    if user is None:
        return None

    user.is_active = active
    record_audit(
        db,
        "user.activate" if active else "user.deactivate",
        actor.id,
        actor.role,
        f"user:{user_id}",
    )
    db.commit()
    db.refresh(user)
    return user
