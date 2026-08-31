"""System Admin and Analytics API endpoints."""

from typing import Annotated, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.audit_log import AuditLogListResponse
from app.schemas.dataset import DatasetSummaryResponse
from app.schemas.role import RoleResponse
from app.services.admission_service import AdmissionService
from app.services.audit_service import AuditService
from app.services.dataset_service import DatasetService
from app.services.patient_service import PatientService
from app.services.treatment_service import TreatmentService
from app.services.user_service import UserService

router = APIRouter(prefix="/admin", tags=["Administration & Intelligence"])


@router.get(
    "/roles",
    response_model=list[RoleResponse],
    summary="List Roles",
    description="Retrieve all available system roles and metadata.",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def list_roles(
    db: Annotated[Session, Depends(get_db)],
) -> list[RoleResponse]:
    roles = db.query(Role).order_by(Role.name).all()
    return [RoleResponse.model_validate(r) for r in roles]


@router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="List Audit Logs",
    description="Retrieve paginated platform audit trail (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def list_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(15, ge=1, le=100, description="Logs per page"),
    current_user: Annotated[User, Depends(get_current_active_user)] = None,
) -> AuditLogListResponse:
    service = AuditService(db)
    items, total = service.list_logs(page=page, page_size=page_size)
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, total_pages),
    )


@router.get(
    "/dataset/summary",
    response_model=DatasetSummaryResponse,
    summary="Get Dataset Summary",
    description="Inspect and report structure, missing values, and column features of the Diabetes 130-US Hospitals dataset.",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN", "RESEARCHER", "HOSPITAL_ADMIN"))],
)
def get_dataset_summary() -> DatasetSummaryResponse:
    service = DatasetService()
    return service.get_dataset_summary()


@router.get(
    "/dashboard-stats",
    summary="Get Role-Tailored Dashboard Metrics",
    description="Retrieve card metrics and widget summaries based on caller's active role.",
)
def get_dashboard_stats(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    role = current_user.role
    patient_service = PatientService(db)
    admission_service = AdmissionService(db)
    treatment_service = TreatmentService(db)
    user_service = UserService(db)
    audit_service = AuditService(db)
    dataset_service = DatasetService()

    if role == "DOCTOR":
        from app.repositories.patient_repository import PatientRepository
        p_repo = PatientRepository(db)
        assigned_count = p_repo.count_by_doctor(current_user.id)
        recent_admissions = admission_service.get_recent_admissions(limit=5, current_user=current_user)
        active_treatments = treatment_service.count_active_treatments(current_user=current_user)
        patients_list, _ = patient_service.list_patients(current_user=current_user, page=1, page_size=5)

        return {
            "role": "DOCTOR",
            "cards": {
                "assigned_patients": assigned_count,
                "recent_admissions": len(recent_admissions),
                "active_treatments": active_treatments,
                "pending_followups": 3,
            },
            "recent_patients": patients_list,
            "recent_admissions": recent_admissions,
        }

    elif role == "HOSPITAL_ADMIN":
        from app.repositories.patient_repository import PatientRepository
        from app.repositories.admission_repository import AdmissionRepository
        p_repo = PatientRepository(db)
        adm_repo = AdmissionRepository(db)

        total_patients = p_repo.count()
        total_admissions = adm_repo.count()
        dept_summary = admission_service.get_department_summary()
        active_treatments = treatment_service.count_active_treatments()
        recent_admissions = admission_service.get_recent_admissions(limit=6)

        return {
            "role": "HOSPITAL_ADMIN",
            "cards": {
                "total_patients": total_patients,
                "total_admissions": total_admissions,
                "departments_count": len(dept_summary),
                "active_treatments": active_treatments,
            },
            "recent_admissions": recent_admissions,
            "department_summary": dept_summary,
        }

    elif role == "RESEARCHER":
        ds_summary = dataset_service.get_dataset_summary()
        from app.repositories.patient_repository import PatientRepository
        p_repo = PatientRepository(db)
        total_anonymized = p_repo.count()
        anon_patients, _ = patient_service.list_patients(current_user=current_user, page=1, page_size=6)

        return {
            "role": "RESEARCHER",
            "cards": {
                "total_anonymized_records": total_anonymized,
                "dataset_records": ds_summary.total_records,
                "feature_columns_count": ds_summary.total_columns,
                "available_research_cohorts": 4,
            },
            "dataset_summary": ds_summary,
            "sample_anonymized_patients": anon_patients,
        }

    else:  # SYSTEM_ADMIN
        from app.repositories.patient_repository import PatientRepository
        p_repo = PatientRepository(db)
        users, total_users = user_service.list_users(page=1, page_size=5)
        audit_logs, total_logs = audit_service.list_logs(page=1, page_size=6)
        total_patients = p_repo.count()

        return {
            "role": "SYSTEM_ADMIN",
            "cards": {
                "total_users": total_users,
                "active_users": total_users,
                "total_patients": total_patients,
                "audit_events_count": total_logs,
            },
            "recent_users": users,
            "recent_audit_logs": audit_logs,
        }
