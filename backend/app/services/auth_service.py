"""auth service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.

Every outcome here is recorded in audit_logs, including failures, because
FR-AUD-01 requires an entry for every authentication event and a failed login is
the one an investigation cares about most.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.rbac import Role, permissions_for
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository


class AuthError(Exception):
    """Raised when a credential check fails. Routers map this to a 401."""


class InactiveAccountError(Exception):
    """Raised when valid credentials belong to a deactivated account."""


class EmailAlreadyRegisteredError(Exception):
    """Raised when a registration reuses an existing email address."""


@dataclass(frozen=True)
class IssuedToken:
    """A signed access token and the authorisation context that came with it."""

    access_token: str
    role: str
    permissions: list[str]


class AuthService:
    """Registration, credential verification and token issuance."""

    def __init__(self, db: Session) -> None:
        self.users = UserRepository(db)
        self.audit = AuditRepository(db)

    def register(
        self,
        email: str,
        full_name: str,
        password: str,
        department: str | None = None,
    ) -> User:
        """Create a self service account.

        The role is chosen here, never by the caller. The first account created on
        an empty database becomes the system administrator so the platform can be
        bootstrapped without a manual database edit; every account after that is a
        doctor, which is the least privileged role in the access matrix.

        Deployment note: because the first registration claims the administrator
        role, a new environment must be registered against immediately after its
        migrations run.
        """
        normalised = email.strip().lower()
        if self.users.email_exists(normalised):
            self.audit.record(
                action="user.register",
                resource=normalised,
                outcome="failure",
            )
            raise EmailAlreadyRegisteredError(normalised)

        role = Role.SYSTEM_ADMIN if self.users.count() == 0 else Role.DOCTOR
        user = self.users.create(
            email=normalised,
            full_name=full_name.strip(),
            hashed_password=hash_password(password),
            role=str(role),
            department=department,
            is_active=True,
        )
        self.audit.record(
            action="user.register",
            actor_id=user.id,
            actor_role=user.role,
            resource=f"user:{user.id}",
        )
        return user

    def authenticate(self, email: str, password: str) -> User:
        """Return the user matching these credentials.

        Raises AuthError for both an unknown address and a wrong password, with no
        detail distinguishing them, so the endpoint cannot be used to discover
        which addresses are registered.
        """
        normalised = email.strip().lower()
        user = self.users.get_by_email(normalised)

        if user is None or not verify_password(password, user.hashed_password):
            self.audit.record(
                action="auth.login",
                actor_id=user.id if user else None,
                actor_role=user.role if user else None,
                resource=normalised,
                outcome="failure",
            )
            raise AuthError("Incorrect email or password")

        if not user.is_active:
            self.audit.record(
                action="auth.login",
                actor_id=user.id,
                actor_role=user.role,
                resource=normalised,
                outcome="failure",
            )
            raise InactiveAccountError(normalised)

        self.audit.record(
            action="auth.login",
            actor_id=user.id,
            actor_role=user.role,
            resource=normalised,
        )
        return user

    @staticmethod
    def issue_token(user: User) -> IssuedToken:
        """Sign an access token for an already authenticated user.

        The subject is the user's primary key, which is what the doctor scope
        checks resolve back to a row.
        """
        role = Role(user.role)
        return IssuedToken(
            access_token=create_access_token(subject=str(user.id), role=str(role)),
            role=str(role),
            permissions=permissions_for(role),
        )

    def login(self, email: str, password: str) -> IssuedToken:
        """Verify credentials and return a signed token."""
        return self.issue_token(self.authenticate(email, password))

    def get_active_user(self, user_id: int) -> User | None:
        """Return the user behind a token subject, if they are still active."""
        user = self.users.get(user_id)
        if user is None or not user.is_active:
            return None
        return user
