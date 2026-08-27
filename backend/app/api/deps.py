"""Shared FastAPI dependencies: authentication and permission guards."""

from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.rbac import Permission, Role, has_permission
from app.core.security import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    """The authenticated caller, reconstructed from JWT claims."""

    subject: str
    role: Role


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """Resolve the caller from the Authorization header, or raise 401."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = decode_token(credentials.credentials)
    if claims is None or not claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        role = Role(claims.get("role", ""))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Unknown role"
        ) from exc

    return CurrentUser(subject=str(claims["sub"]), role=role)


def require_permission(permission: Permission) -> Callable[[CurrentUser], CurrentUser]:
    """Build a dependency that rejects callers lacking the given permission."""

    def guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
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

    def guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted to access this resource",
            )
        return user

    return guard
