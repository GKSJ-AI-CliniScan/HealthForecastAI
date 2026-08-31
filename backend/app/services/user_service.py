"""user service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.

Owns the rules that outlive a single request: email uniqueness, role assignment,
and the guarantee that the platform never loses its last administrator.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.core.security import hash_password
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import EmailAlreadyRegisteredError

# Fields a system administrator may change through the update endpoint. Email and
# password are deliberately absent: changing an identity or a credential is a
# different workflow with its own audit trail.
UPDATABLE_FIELDS = frozenset({"full_name", "department", "role", "is_active"})


class UserNotFoundError(Exception):
    """Raised when the requested user id does not exist."""


class LastAdministratorError(Exception):
    """Raised when a change would leave the platform with no active administrator."""


class UnknownFieldError(Exception):
    """Raised when an update names a field that is not updatable."""


class UserService:
    """Creation, listing and administration of platform users."""

    def __init__(self, db: Session) -> None:
        self.users = UserRepository(db)
        self.audit = AuditRepository(db)

    def create_user(
        self,
        email: str,
        full_name: str,
        password: str,
        role: Role,
        department: str | None = None,
        actor_id: int | None = None,
        actor_role: str | None = None,
    ) -> User:
        """Create an account on a system administrator's behalf.

        Unlike registration, the role is taken from the payload: this endpoint is
        already restricted to callers holding user:manage, so choosing a role here
        is the intended administrative action rather than an escalation.
        """
        normalised = email.strip().lower()
        if self.users.email_exists(normalised):
            self.audit.record(
                action="user.create",
                actor_id=actor_id,
                actor_role=actor_role,
                resource=normalised,
                outcome="failure",
            )
            raise EmailAlreadyRegisteredError(normalised)

        user = self.users.create(
            email=normalised,
            full_name=full_name.strip(),
            hashed_password=hash_password(password),
            role=str(role),
            department=department,
            is_active=True,
        )
        self.audit.record(
            action="user.create",
            actor_id=actor_id,
            actor_role=actor_role,
            resource=f"user:{user.id}",
        )
        return user

    def list_users(
        self,
        limit: int = 50,
        offset: int = 0,
        role: Role | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        """Return a page of users and the total matching the same filters."""
        rows = self.users.list_users(limit=limit, offset=offset, role=role, is_active=is_active)
        return rows, self.users.count_users(role=role, is_active=is_active)

    def get_user(self, user_id: int) -> User:
        """Return one user or raise UserNotFoundError."""
        user = self.users.get(user_id)
        if user is None:
            raise UserNotFoundError(str(user_id))
        return user

    def _is_last_active_administrator(self, user: User) -> bool:
        """Return True when this user is the only active system administrator left."""
        if user.role != str(Role.SYSTEM_ADMIN) or not user.is_active:
            return False
        return self.users.count_users(role=Role.SYSTEM_ADMIN, is_active=True) <= 1

    def update_user(
        self,
        user_id: int,
        changes: dict[str, Any],
        actor_id: int | None = None,
        actor_role: str | None = None,
    ) -> User:
        """Apply a partial update.

        ``changes`` carries only the fields the caller actually sent, so omitted
        fields keep their stored value.

        Demoting or deactivating the last active system administrator is refused.
        Nobody could reach the user management endpoints afterwards, which would
        leave the platform unrecoverable through the API.
        """
        unknown = set(changes) - UPDATABLE_FIELDS
        if unknown:
            raise UnknownFieldError(", ".join(sorted(unknown)))

        user = self.get_user(user_id)

        losing_admin_role = "role" in changes and str(changes["role"]) != str(Role.SYSTEM_ADMIN)
        being_deactivated = changes.get("is_active") is False
        if (losing_admin_role or being_deactivated) and self._is_last_active_administrator(user):
            self.audit.record(
                action="user.update",
                actor_id=actor_id,
                actor_role=actor_role,
                resource=f"user:{user.id}",
                outcome="failure",
            )
            raise LastAdministratorError(str(user.id))

        if "role" in changes:
            changes = {**changes, "role": str(changes["role"])}

        updated = self.users.update(user, **changes)
        self.audit.record(
            action="user.update",
            actor_id=actor_id,
            actor_role=actor_role,
            resource=f"user:{updated.id}",
        )
        return updated
