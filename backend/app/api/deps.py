"""Shared FastAPI dependencies: authentication, identity and permission guards.

The guards here are the only place a request is authorised. Two layers apply:

* ``require_permission`` / ``require_role`` answer "may this role touch this kind
  of resource at all", from the access matrix in app.core.rbac.
* ``patient_scope_for`` answers "which rows of that resource", which is what keeps
  a doctor inside their assigned patients.

Both run on the server. A frontend that hides a menu item is not access control.
"""

from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.rbac import Permission, Role, has_permission
from app.core.security import decode_token
from app.db.session import get_db
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    """The authenticated caller, reconstructed from JWT claims."""

    subject: str
    role: Role

    @property
    def user_id(self) -> int | None:
        """Return the caller's primary key, or None when the subject is not one.

        AuthService puts the user id in the token subject. This stays tolerant of
        a non numeric subject so a token minted for a test or a future service
        account does not crash a handler that only needs the role.
        """
        try:
            return int(self.subject)
        except ValueError:
            return None


def _unauthenticated(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """Resolve the caller from the Authorization header, or raise 401.

    This trusts the signature only. It does not confirm the account still exists,
    so routes that act on data use get_current_active_user instead.
    """
    if credentials is None:
        raise _unauthenticated("Not authenticated")

    claims = decode_token(credentials.credentials)
    if claims is None or not claims.get("sub"):
        raise _unauthenticated("Invalid or expired token")

    try:
        role = Role(claims.get("role", ""))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown role") from exc

    return CurrentUser(subject=str(claims["sub"]), role=role)


def get_current_active_user(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """Resolve the caller and confirm the account is still usable.

    A signed token stays valid until it expires, so without this check a user who
    was deleted or deactivated would keep their access for the rest of the token's
    lifetime. The role is re-read from the database rather than trusted from the
    token, so a demotion takes effect on the next request instead of the next login.
    """
    user_id = user.user_id
    if user_id is None:
        raise _unauthenticated("Token subject is not a user id")

    record = UserRepository(db).get(user_id)
    if record is None:
        raise _unauthenticated("Account no longer exists")
    if not record.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    try:
        role = Role(record.role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown role") from exc

    return CurrentUser(subject=str(record.id), role=role)


def require_permission(permission: Permission) -> Callable[[CurrentUser], CurrentUser]:
    """Build a dependency that rejects callers lacking the given permission."""

    def guard(user: CurrentUser = Depends(get_current_active_user)) -> CurrentUser:
        if not has_permission(user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' lacks permission '{permission}'",
            )
        return user

    return guard


def require_role(*roles: Role) -> Callable[[CurrentUser], CurrentUser]:
    """Build a dependency that only allows the listed roles."""

    allowed = frozenset(roles)

    def guard(user: CurrentUser = Depends(get_current_active_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted to access this resource",
            )
        return user

    return guard


def patient_scope_for(user: CurrentUser) -> int | None:
    """Return the doctor id patient queries must be narrowed by.

    A doctor is limited to their own assigned patients, so their id is returned and
    PatientRepository applies the assigned_doctor_id / doctor_patient_map union.
    Every other role in the access matrix reads hospital wide, so they get None,
    which means "do not narrow". Researchers never reach this: the matrix routes
    them to the anonymised endpoint instead.

    Returning the id from the authenticated caller, never from a request parameter,
    is what stops one doctor from asking for another doctor's list.
    """
    if user.role is Role.DOCTOR:
        return user.user_id
    return None
