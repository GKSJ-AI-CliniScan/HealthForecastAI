"""Admissions API endpoints."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.admission import (
    AdmissionCreate,
    AdmissionResponse,
    AdmissionUpdate,
)
from app.services.admission_service import AdmissionService

router = APIRouter(tags=["Admissions"])


@router.get(
    "/patients/{patient_id}/admissions",
    response_model=list[AdmissionResponse],
    summary="Get Patient Admissions",
    description="Retrieve all admission records for a patient.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_patient_admissions(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[AdmissionResponse]:
    service = AdmissionService(db)
    return service.get_patient_admissions(patient_id, current_user=current_user)


@router.post(
    "/patients/{patient_id}/admissions",
    response_model=AdmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Admission Episode",
    description="Record a new hospital admission (Doctor, Hospital Admin, System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "SYSTEM_ADMIN"))],
)
def create_admission(
    patient_id: uuid.UUID,
    payload: AdmissionCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionResponse:
    service = AdmissionService(db)
    return service.create_admission(patient_id, payload, current_user=current_user)


@router.put(
    "/admissions/{admission_id}",
    response_model=AdmissionResponse,
    summary="Update Admission Episode",
    description="Update admission or discharge details (Assigned Doctor or System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def update_admission(
    admission_id: uuid.UUID,
    payload: AdmissionUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AdmissionResponse:
    service = AdmissionService(db)
    return service.update_admission(admission_id, payload, current_user=current_user)


@router.delete(
    "/admissions/{admission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Admission Record",
    description="Delete an admission record (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def delete_admission(
    admission_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    service = AdmissionService(db)
    service.delete_admission(admission_id, current_user=current_user)
