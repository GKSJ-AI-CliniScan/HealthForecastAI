"""Medical History API endpoints."""

import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.medical_history import (
    MedicalHistoryCreate,
    MedicalHistoryResponse,
    MedicalHistoryUpdate,
)
from app.services.medical_history_service import MedicalHistoryService

router = APIRouter(tags=["Medical History"])


@router.get(
    "/patients/{patient_id}/medical-history",
    response_model=list[MedicalHistoryResponse],
    summary="Get Patient Medical History",
    description="Retrieve all medical history entries for a patient.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_patient_medical_history(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[MedicalHistoryResponse]:
    service = MedicalHistoryService(db)
    return service.get_patient_medical_history(patient_id, current_user=current_user)


@router.post(
    "/patients/{patient_id}/medical-history",
    response_model=MedicalHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Medical History Entry",
    description="Create a new medical history record for a patient (Assigned Doctor or System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def create_medical_history(
    patient_id: uuid.UUID,
    payload: MedicalHistoryCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MedicalHistoryResponse:
    service = MedicalHistoryService(db)
    return service.create_medical_history(patient_id, payload, current_user=current_user)


@router.put(
    "/medical-history/{history_id}",
    response_model=MedicalHistoryResponse,
    summary="Update Medical History",
    description="Update an existing medical history record (Assigned Doctor or System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def update_medical_history(
    history_id: uuid.UUID,
    payload: MedicalHistoryUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MedicalHistoryResponse:
    service = MedicalHistoryService(db)
    return service.update_medical_history(history_id, payload, current_user=current_user)


@router.delete(
    "/medical-history/{history_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Medical History",
    description="Delete a medical history entry (SYSTEM_ADMIN only).",
    dependencies=[Depends(require_roles("SYSTEM_ADMIN"))],
)
def delete_medical_history(
    history_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    service = MedicalHistoryService(db)
    service.delete_medical_history(history_id, current_user=current_user)
