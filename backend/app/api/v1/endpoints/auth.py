"""Authentication endpoints - Module 1 (User Management)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_current_active_user
from app.core.rbac import Role, permissions_for
from app.db.session import get_db
from app.schemas.token import Token
from app.schemas.user import UserLogin, UserRead, UserRegister
from app.services.auth_service import (
    AuthError,
    AuthService,
    EmailAlreadyRegisteredError,
    InactiveAccountError,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account",
)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> UserRead:
    """Register a new account.

    The role is assigned by the server. A caller cannot request one, so this
    endpoint is not a privilege escalation path. See AuthService.register for how
    the first account on an empty database is treated.
    """
    service = AuthService(db)
    try:
        user = service.register(
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
            department=payload.department,
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email address is already registered",
        ) from exc
    return UserRead.model_validate(user)


@router.post("/login", response_model=Token, summary="Exchange credentials for a JWT")
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Authenticate a user and issue an access token."""
    service = AuthService(db)
    try:
        issued = service.login(email=payload.email, password=payload.password)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except InactiveAccountError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        ) from exc

    return Token(
        access_token=issued.access_token,
        role=issued.role,
        permissions=issued.permissions,
    )


@router.get("/me", summary="Return the authenticated caller and their permissions")
def read_me(
    user: CurrentUser = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> dict[str, object]:
    """Return the caller's identity, role, permissions and profile.

    The frontend reads this after login to decide which dashboard sections to
    render. The permission list is the same one the server enforces, so the two
    can never disagree about what a role may do.
    """
    body: dict[str, object] = {
        "subject": user.subject,
        "role": str(user.role),
        "permissions": permissions_for(user.role),
        "profile": None,
    }

    user_id = user.user_id
    if user_id is not None:
        record = AuthService(db).get_active_user(user_id)
        if record is not None:
            body["profile"] = UserRead.model_validate(record).model_dump(mode="json")
    return body


@router.get("/roles", summary="List the roles supported by the platform")
def list_roles() -> dict[str, list[str]]:
    """Expose the role catalogue and the permissions attached to each role."""
    return {str(role): permissions_for(role) for role in Role}
