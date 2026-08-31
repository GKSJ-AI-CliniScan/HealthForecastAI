"""Treatments API endpoints."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.treatment import (
    TreatmentCreate,
    TreatmentResponse,
    TreatmentUpdate,
)
from app.services.treatment_service import TreatmentService

router = APIRouter(tags=["Treatments"])


@router.get(
    "/patients/{patient_id}/treatments",
    response_model=list[TreatmentResponse],
    summary="Get Patient Treatments",
    description="Retrieve all clinical treatments prescribed for a patient.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_patient_treatments(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[TreatmentResponse]:
    service = TreatmentService(db)
    return service.get_patient_treatments(patient_id, current_user=current_user)


@router.post(
    "/patients/{patient_id}/treatments",
    response_model=TreatmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Prescribe/Record Treatment",
    description="Record a new treatment for a patient (Assigned Doctor or System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def create_treatment(
    patient_id: uuid.UUID,
    payload: TreatmentCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TreatmentResponse:
    service = TreatmentService(db)
    return service.create_treatment(patient_id, payload, current_user=current_user)


@router.put(
    "/treatments/{treatment_id}",
    response_model=TreatmentResponse,
    summary="Update Treatment Record",
    description="Update treatment status or clinical notes (Assigned Doctor or System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def update_treatment(
    treatment_id: uuid.UUID,
    payload: TreatmentUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TreatmentResponse:
    service = TreatmentService(db)
    return service.update_treatment(treatment_id, payload, current_user=current_user)


@router.delete(
    "/treatments/{treatment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Treatment Record",
    description="Delete a treatment record (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def delete_treatment(
    treatment_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    service = TreatmentService(db)
    service.delete_treatment(treatment_id, current_user=current_user)
