"""Compatibility administration API for the original Vite dashboard."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.rbac import Permission, Role
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.common import ApiEnvelope
from app.schemas.user import UserCreate, UserRead
from app.services import auth_service, model_service

router = APIRouter()
Admin = Annotated[User, Depends(require_permission(Permission.USER_MANAGE))]
Db = Annotated[Session, Depends(get_db)]


@router.get("/dashboard", response_model=ApiEnvelope[dict[str, object]])
def dashboard(actor: Admin, db: Db) -> ApiEnvelope[dict[str, object]]:
    users = auth_service.list_users(db)
    logs = list(db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(10)).scalars())
    return ApiEnvelope.ok(
        {
            "usersCount": len(users),
            "modelsCount": 1 if model_service.model_info().get("loaded") else 0,
            "datasetsCount": 0,
            "logsCount": len(logs),
            "recentLogs": [
                {
                    "id": log.id,
                    "user": log.actor_id,
                    "role": log.actor_role,
                    "action": log.action,
                    "timestamp": log.created_at.isoformat(),
                    "details": log.resource,
                }
                for log in logs
            ],
        }
    )


@router.get("/users", response_model=ApiEnvelope[list[UserRead]])
def users(actor: Admin, db: Db) -> ApiEnvelope[list[UserRead]]:
    return ApiEnvelope.ok([UserRead.model_validate(user) for user in auth_service.list_users(db)])


@router.post("/users", response_model=ApiEnvelope[UserRead], status_code=status.HTTP_201_CREATED)
def create_user(payload: dict[str, object], actor: Admin, db: Db) -> ApiEnvelope[UserRead]:
    role = str(payload.get("role", Role.DOCTOR)).replace("-", "_")
    user_payload = UserCreate(
        email=str(payload.get("email", "")),
        full_name=str(payload.get("full_name") or payload.get("name") or ""),
        role=Role(role),
        department=payload.get("department"),
        password=str(payload.get("password") or "ChangeMeImmediately123!"),
    )
    try:
        user = auth_service.create_user(db, user_payload, actor=actor)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return ApiEnvelope.ok(UserRead.model_validate(user))


@router.put("/users/{user_id}/status", response_model=ApiEnvelope[list[UserRead]])
def toggle_user_status(user_id: int, actor: Admin, db: Db) -> ApiEnvelope[list[UserRead]]:
    if user_id == actor.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own status")
    user = auth_service.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    auth_service.set_user_active(db, user_id, not user.is_active, actor)
    return ApiEnvelope.ok([UserRead.model_validate(item) for item in auth_service.list_users(db)])


@router.put("/users/{user_id}/role", response_model=ApiEnvelope[list[UserRead]])
def update_user_role(
    user_id: int, payload: dict[str, str], actor: Admin, db: Db
) -> ApiEnvelope[list[UserRead]]:
    user = auth_service.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        user.role = str(Role(payload["role"].replace("-", "_")))
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role") from exc
    db.commit()
    return ApiEnvelope.ok([UserRead.model_validate(item) for item in auth_service.list_users(db)])


@router.get("/audit-logs", response_model=ApiEnvelope[list[dict[str, object]]])
def audit_logs(actor: Annotated[User, Depends(require_permission(Permission.AUDIT_LOG_READ))], db: Db) -> ApiEnvelope[list[dict[str, object]]]:
    rows = list(db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500)).scalars())
    return ApiEnvelope.ok(
        [
            {
                "id": row.id,
                "user": row.actor_id,
                "role": row.actor_role,
                "action": row.action,
                "resource": row.resource,
                "status": row.outcome,
                "timestamp": row.created_at.isoformat(),
            }
            for row in rows
        ]
    )


@router.get("/ai-models", response_model=ApiEnvelope[list[dict[str, object]]])
def ai_models(actor: Annotated[User, Depends(require_permission(Permission.MODEL_MANAGE))]) -> ApiEnvelope[list[dict[str, object]]]:
    info = model_service.model_info()
    return ApiEnvelope.ok([info] if info.get("loaded") else [])


@router.post("/ai-models/{model_id}/action", response_model=ApiEnvelope[list[dict[str, object]]])
def ai_model_action(
    model_id: str,
    payload: dict[str, str],
    actor: Annotated[User, Depends(require_permission(Permission.MODEL_MANAGE))],
) -> ApiEnvelope[list[dict[str, object]]]:
    action = payload.get("action")
    if action not in {"reload", "deploy", "train", "rollback"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported model action")
    if action == "reload":
        model_service.reset_cache()
    info = model_service.model_info()
    return ApiEnvelope.ok([info] if info.get("loaded") else [])


@router.get("/datasets", response_model=ApiEnvelope[list[dict[str, object]]])
def datasets(actor: Annotated[User, Depends(require_permission(Permission.RESEARCH_DATASET_EXPORT))]) -> ApiEnvelope[list[dict[str, object]]]:
    return ApiEnvelope.ok([])


@router.post("/datasets", response_model=ApiEnvelope[dict[str, object]], status_code=status.HTTP_201_CREATED)
def upload_dataset(
    payload: dict[str, object],
    actor: Annotated[User, Depends(require_permission(Permission.RESEARCH_DATASET_EXPORT))],
) -> ApiEnvelope[dict[str, object]]:
    return ApiEnvelope.ok(
        {
            "name": payload.get("name", "uploaded-dataset"),
            "recordsCount": payload.get("recordsCount", 0),
            "format": payload.get("format", "CSV"),
            "status": "registered",
        }
    )
