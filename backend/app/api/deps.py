"""Shared FastAPI dependencies: authentication and permission guards.

Two layers of caller identity are available.

``get_current_user`` reconstructs the caller from the token alone. It is cheap,
needs no database, and is what the service level routes use.

``get_verified_user`` additionally reloads the account and rejects it when it has
been deleted or disabled. Endpoints that return patient data use this one,
because a token stays valid until it expires: without the reload, revoking
someone's access would not take effect until then.
"""

from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.rbac import Permission, Role, has_permission, permissions_for
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

CREDENTIALS_HEADER = {"WWW-Authenticate": "Bearer"}


# Re-exported so that ``app.api.deps.get_db`` and ``app.db.session.get_db`` are
# the same object. Tests override the dependency by identity, so two separate
# definitions would mean overriding one leaves the other pointing at the real
# database.
__all__ = ["get_db"]


@dataclass(frozen=True)
class CurrentUser:
    """The authenticated caller, reconstructed from JWT claims."""

    subject: str
    role: Role

    @property
    def permissions(self) -> list[str]:
        """Return the permission strings granted to this caller's role."""
        return permissions_for(self.role)


@dataclass(frozen=True)
class VerifiedUser(CurrentUser):
    """A caller whose account has been confirmed to exist and be active."""

    id: int = 0
    full_name: str = ""


def _unauthorised(detail: str) -> HTTPException:
    """Build a 401 with the bearer challenge header attached."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers=CREDENTIALS_HEADER
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """Resolve the caller from the Authorization header, or raise 401.

    An unrecognised role is rejected rather than defaulted. Falling back to a
    clinical role would turn a corrupted record into a privilege escalation.
    """
    if credentials is None:
        raise _unauthorised("Not authenticated")

    claims = decode_token(credentials.credentials)
    if claims is None or not claims.get("sub"):
        raise _unauthorised("Invalid or expired token")

    try:
        role = Role(claims.get("role", ""))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown role") from exc

    return CurrentUser(subject=str(claims["sub"]), role=role)


def verify_account(caller: CurrentUser, db: Session) -> VerifiedUser:
    """Reload the caller's account and reject deleted or disabled users.

    Also rejects a token whose role no longer matches the stored one, so a
    demotion takes effect immediately rather than at token expiry.
    """
    user = db.query(User).filter(User.email == caller.subject).one_or_none()
    if user is None:
        raise _unauthorised("User no longer exists")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    if user.role != str(caller.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Token role no longer matches account"
        )

    return VerifiedUser(subject=user.email, role=caller.role, id=user.id, full_name=user.full_name)


def require_permission(permission: Permission) -> Callable[..., CurrentUser]:
    """Build a dependency that rejects callers lacking the given permission."""

    def guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not has_permission(user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' lacks permission '{permission}'",
            )
        return user

    return guard


def require_role(*roles: Role) -> Callable[..., CurrentUser]:
    """Build a dependency that only allows the listed roles."""

    allowed = frozenset(roles)

    def guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted to access this resource",
            )
        return user

    return guard


def require_verified_permission(permission: Permission) -> Callable[..., VerifiedUser]:
    """Guard on a permission, then confirm the account is still active.

    The permission is checked from the token claims first and the account is
    reloaded only if it passes. Ordering it this way means a caller who was never
    allowed here is rejected without a database round trip, and an endpoint they
    cannot reach cannot be used to probe whether the database is up.
    """

    def guard(
        caller: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
    ) -> VerifiedUser:
        if not has_permission(caller.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{caller.role}' lacks permission '{permission}'",
            )
        return verify_account(caller, db)

    return guard


def require_any_verified_permission(*permissions: Permission) -> Callable[..., VerifiedUser]:
    """Allow a verified caller holding at least one of the given permissions.

    Several roles reach the same endpoint through different rights: a doctor
    reads assigned patients, an administrator reads all of them. As above, the
    permission is checked before the account is reloaded.
    """

    def guard(
        caller: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
    ) -> VerifiedUser:
        if not any(has_permission(caller.role, permission) for permission in permissions):
            allowed = ", ".join(str(p) for p in permissions)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{caller.role}' needs one of: {allowed}",
            )
        return verify_account(caller, db)

    return guard
