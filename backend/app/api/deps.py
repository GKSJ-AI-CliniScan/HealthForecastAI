"""Shared FastAPI dependencies: authentication and permission guards.

Every protected endpoint resolves the caller through get_current_user, which
loads the real user row - the scoping rules in patient_service need the user's
id, not just the claims in the token.
"""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.rbac import Permission, Role, has_permission
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

UNAUTHORISED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Resolve the caller from the Authorization header, or raise 401."""
    if credentials is None:
        raise UNAUTHORISED

    claims = decode_token(credentials.credentials)
    if claims is None or not claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(claims["sub"])
    except (TypeError, ValueError) as exc:
        raise UNAUTHORISED from exc

    user = db.get(User, user_id)
    if user is None:
        raise UNAUTHORISED

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="This account is deactivated"
        )

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_permission(permission: Permission) -> Callable[[User], User]:
    """Build a dependency that rejects callers lacking the given permission."""

    def guard(user: CurrentUser) -> User:
        if not has_permission(Role(user.role), permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' lacks permission '{permission}'",
            )
        return user

    return guard


def require_role(*roles: Role) -> Callable[[User], User]:
    """Build a dependency that only allows the listed roles."""

    allowed = frozenset(str(role) for role in roles)

    def guard(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted to access this resource",
            )
        return user

    return guard
