"""Patient Management API endpoints."""

import uuid
from typing import Annotated, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.patient import (
    AnonymizedPatientResponse,
    PatientCreate,
    PatientListResponse,
    PatientResponse,
    PatientUpdate,
)
from app.services.patient_service import PatientService

router = APIRouter(prefix="/patients", tags=["Patient Management"])


@router.get(
    "",
    response_model=PatientListResponse,
    summary="List Patients",
    description=(
        "Retrieve patients with role-based scoping and backend anonymization. "
        "Doctors receive only assigned patients. "
        "Researchers receive de-identified records without PII."
    ),
)
def list_patients(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Page size"),
    search: str | None = Query(None, description="Search by name, identifier, or email"),
    gender: str | None = Query(None, description="Filter by gender"),
) -> PatientListResponse:
    service = PatientService(db)
    items, total = service.list_patients(
        current_user=current_user,
        page=page,
        page_size=page_size,
        search=search,
        gender=gender,
    )
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    return PatientListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, total_pages),
    )


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Patient",
    description="Create a new patient record (Doctor, Hospital Admin, System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "SYSTEM_ADMIN"))],
)
def create_patient(
    payload: PatientCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientResponse:
    service = PatientService(db)
    return service.create_patient(payload, current_user=current_user)


@router.get(
    "/{patient_id}",
    summary="Get Patient Details",
    description="Retrieve a patient record. Returns anonymized entity for RESEARCHER.",
)
def get_patient(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Any:
    service = PatientService(db)
    return service.get_patient_by_id(patient_id, current_user=current_user)


@router.put(
    "/{patient_id}",
    response_model=PatientResponse,
    summary="Update Patient",
    description="Update patient demographic details (Assigned Doctor or System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def update_patient(
    patient_id: uuid.UUID,
    payload: PatientUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientResponse:
    service = PatientService(db)
    return service.update_patient(patient_id, payload, current_user=current_user)


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Patient",
    description="Delete a patient record and cascade all child records (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def delete_patient(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    service = PatientService(db)
    service.delete_patient(patient_id, current_user=current_user)
