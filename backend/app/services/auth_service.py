"""Authentication and user management.

Users live in an in-memory store seeded with one demo account per role, so the
API runs without a database. The store sits behind these functions, so replacing
it with the PostgreSQL ``users`` table (database/postgres/schema) only changes this file.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from threading import Lock

from app.core.rbac import Role
from app.core.security import hash_password, verify_password

_lock = Lock()


@dataclass
class UserRecord:
    """A platform user as stored by the service."""

    id: int
    email: str
    full_name: str
    role: Role
    password_hash: str
    department: str | None = None
    is_active: bool = True
    created_at: datetime | None = None


@dataclass(frozen=True)
class AuditEntry:
    """One security relevant event."""

    at: datetime
    actor: str
    action: str
    outcome: str


DEMO_ACCOUNTS: list[tuple[str, str, Role, str, str | None]] = [
    ("doctor1@hospital-demo.com", "Dr. Asha Menon", Role.DOCTOR, "Doctor@123", "Cardiology"),
    ("doctor2@hospital-demo.com", "Dr. Rahul Verma", Role.DOCTOR, "Doctor@456", "Endocrinology"),
    ("admin@hospital-demo.com", "Hospital Administrator", Role.HOSPITAL_ADMIN, "Admin@123", None),
    (
        "researcher@hospital-demo.com",
        "Healthcare Researcher",
        Role.RESEARCHER,
        "Research@123",
        None,
    ),
    ("sysadmin@hospital-demo.com", "System Administrator", Role.SYSTEM_ADMIN, "SysAdmin@123", None),
]

_users: dict[int, UserRecord] = {}
_audit: list[AuditEntry] = []


def _seed() -> None:
    now = datetime.now(UTC)
    for index, (email, name, role, password, department) in enumerate(DEMO_ACCOUNTS, start=1):
        _users[index] = UserRecord(
            id=index,
            email=email,
            full_name=name,
            role=role,
            password_hash=hash_password(password),
            department=department,
            created_at=now,
        )


@lru_cache
def _ensure_seeded() -> bool:
    with _lock:
        if not _users:
            _seed()
    return True


def record_audit(actor: str, action: str, outcome: str) -> None:
    """Append an entry to the audit trail."""
    _audit.append(AuditEntry(at=datetime.now(UTC), actor=actor, action=action, outcome=outcome))


def audit_trail() -> list[AuditEntry]:
    """Return the audit entries, newest first."""
    return list(reversed(_audit))


def list_users() -> list[UserRecord]:
    """Return every user ordered by id."""
    _ensure_seeded()
    return sorted(_users.values(), key=lambda u: u.id)


def find_by_email(email: str) -> UserRecord | None:
    """Return the user with this e-mail address (case insensitive), if any."""
    _ensure_seeded()
    wanted = email.strip().lower()
    return next((u for u in _users.values() if u.email.lower() == wanted), None)


def authenticate(email: str, password: str) -> UserRecord | None:
    """Return the user when the credentials are valid and the account is active."""
    user = find_by_email(email)
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        record_audit(email, "login", "denied")
        return None
    record_audit(email, "login", "success")
    return user


def create_user(
    *, email: str, full_name: str, role: Role, password: str, department: str | None = None
) -> UserRecord:
    """Create a user. Raises ValueError when the e-mail is already registered."""
    _ensure_seeded()
    with _lock:
        if find_by_email(email) is not None:
            raise ValueError("A user with this e-mail already exists")
        user_id = max(_users, default=0) + 1
        record = UserRecord(
            id=user_id,
            email=email.strip().lower(),
            full_name=full_name,
            role=role,
            password_hash=hash_password(password),
            department=department,
            created_at=datetime.now(UTC),
        )
        _users[user_id] = record
    return record
