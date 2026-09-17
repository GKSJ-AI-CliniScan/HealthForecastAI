"""Medications API endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.medication import (
    MedicationCreate,
    MedicationResponse,
    MedicationUpdate,
)
from app.services.medication_service import MedicationService

router = APIRouter(tags=["Medications"])


@router.get(
    "/patients/{patient_id}/medications",
    response_model=list[MedicationResponse],
    summary="Get Patient Medications",
    description="Retrieve all clinical medications prescribed for a patient.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_patient_medications(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[MedicationResponse]:
    service = MedicationService(db)
    return service.get_patient_medications(patient_id, current_user=current_user)


@router.post(
    "/patients/{patient_id}/medications",
    response_model=MedicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Prescribe Medication",
    description="Record a new medication prescription for a patient (Assigned Doctor or System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def create_medication(
    patient_id: uuid.UUID,
    payload: MedicationCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MedicationResponse:
    service = MedicationService(db)
    return service.create_medication(patient_id, payload, current_user=current_user)


@router.put(
    "/medications/{medication_id}",
    response_model=MedicationResponse,
    summary="Update Medication Record",
    description="Update medication dosage, status, or outcome score.",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def update_medication(
    medication_id: uuid.UUID,
    payload: MedicationUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MedicationResponse:
    service = MedicationService(db)
    return service.update_medication(medication_id, payload, current_user=current_user)


@router.delete(
    "/medications/{medication_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Medication Record",
    description="Delete a medication record (SYSTEM_ADMIN or Assigned Doctor).",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def delete_medication(
    medication_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    service = MedicationService(db)
    service.delete_medication(medication_id, current_user=current_user)
