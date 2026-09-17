"""Recovery and Patient Outcomes API endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import PatientRecoveryResponse
from app.schemas.patient_outcome import (
    PatientOutcomeCreate,
    PatientOutcomeResponse,
)
from app.services.recovery_service import RecoveryService

router = APIRouter(tags=["Recovery Analytics"])


@router.get(
    "/patients/{patient_id}/recovery",
    response_model=PatientRecoveryResponse,
    summary="Get Patient Recovery Analysis",
    description="Retrieve unified chronological recovery timeline, admission/discharge progression, and stay metrics.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_patient_recovery(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientRecoveryResponse:
    service = RecoveryService(db)
    return service.get_patient_recovery(patient_id, current_user=current_user)


@router.get(
    "/patients/{patient_id}/outcomes",
    response_model=list[PatientOutcomeResponse],
    summary="List Patient Recovery Outcomes",
    description="Retrieve all recorded clinical outcome assessments for a patient.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_patient_outcomes(
    patient_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[PatientOutcomeResponse]:
    service = RecoveryService(db)
    return service.get_patient_outcomes(patient_id, current_user=current_user)


@router.post(
    "/patients/{patient_id}/outcomes",
    response_model=PatientOutcomeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Recovery Outcome",
    description="Record a patient clinical recovery assessment (Assigned Doctor or System Admin).",
    dependencies=[Depends(require_roles("DOCTOR", "SYSTEM_ADMIN"))],
)
def create_patient_outcome(
    patient_id: uuid.UUID,
    payload: PatientOutcomeCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PatientOutcomeResponse:
    service = RecoveryService(db)
    return service.create_patient_outcome(patient_id, payload, current_user=current_user)
