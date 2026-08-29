"""Authentication endpoints: login, account creation and identity."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_user, get_db, require_permission
from app.core.config import settings
from app.core.rbac import PERMISSIONS, Permission, Role, permissions_for
from app.core.security import create_access_token
from app.schemas.user import LoginRequest, RoleInfo, TokenResponse, UserCreate, UserRead
from app.services import auth_service

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="Exchange credentials for a token")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate a user and issue a signed access token."""
    try:
        user = auth_service.authenticate(db, payload.email, payload.password)
    except auth_service.AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    token = create_access_token(subject=user.email, role=user.role)
    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserRead.model_validate(user),
    )


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a platform account (system administrators only)",
)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _caller: CurrentUser = Depends(require_permission(Permission.USER_MANAGE)),
) -> UserRead:
    """Create an account.

    Registration is deliberately not public: in a hospital system, accounts are
    provisioned by an administrator, not self-served by whoever finds the URL.
    """
    try:
        user = auth_service.create_user(db, payload)
    except auth_service.DuplicateUserError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return UserRead.model_validate(user)


@router.get("/me", summary="Return the authenticated caller and their permissions")
def read_me(caller: CurrentUser = Depends(get_current_user)) -> dict[str, object]:
    """Return the caller's identity so the frontend can shape its navigation.

    Resolved from the token alone. The display fields the UI needs are already
    in the login response, so there is nothing here worth a database round trip
    on every page load.
    """
    return {
        "email": caller.subject,
        "role": str(caller.role),
        "permissions": caller.permissions,
    }


@router.get("/roles", response_model=list[RoleInfo], summary="List roles and their permissions")
def list_roles() -> list[RoleInfo]:
    """Expose the access matrix.

    This is the same source of truth the guards use, so the documentation cannot
    drift away from the enforcement.
    """
    return [RoleInfo(role=str(role), permissions=permissions_for(role)) for role in PERMISSIONS]


@router.get("/roles/{role_name}", response_model=RoleInfo, summary="Permissions for one role")
def get_role(role_name: str) -> RoleInfo:
    """Return the permissions granted to a single role."""
    try:
        role = Role(role_name.strip().lower())
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown role '{role_name}'"
        ) from exc
    return RoleInfo(role=str(role), permissions=permissions_for(role))
