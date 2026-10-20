"""User management endpoints - Module 1 (System Administrator only)."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.schemas.user import UserCreate, UserRead
from app.services import auth_service

router = APIRouter()

_manage_users = require_permission(Permission.USER_MANAGE)


@router.get("", response_model=list[UserRead], summary="List platform users")
def list_users(user: CurrentUser = Depends(_manage_users)) -> list[UserRead]:
    """Return every platform user."""
    return [UserRead.model_validate(record) for record in auth_service.list_users()]


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, user: CurrentUser = Depends(_manage_users)) -> UserRead:
    """Create a new platform user (the password is stored as a bcrypt hash)."""
    try:
        record = auth_service.create_user(
            email=payload.email,
            full_name=payload.full_name,
            role=payload.role,
            password=payload.password,
            department=payload.department,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    auth_service.record_audit(f"user:{user.subject}", f"create_user:{record.id}", "success")
    return UserRead.model_validate(record)


@router.get("/audit-log", summary="Recent security events")
def read_audit_log(
    user: CurrentUser = Depends(require_permission(Permission.AUDIT_LOG_READ)),
) -> list[dict[str, str]]:
    """Return the audit trail, newest first (system administrator only)."""
    return [
        {"at": e.at.isoformat(), "actor": e.actor, "action": e.action, "outcome": e.outcome}
        for e in auth_service.audit_trail()[:100]
    ]
