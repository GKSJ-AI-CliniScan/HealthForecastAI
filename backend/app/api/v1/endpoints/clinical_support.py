"""Clinical decision support endpoints - Module 5."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.services import cds_service, patient_service

router = APIRouter()

_generate = require_permission(Permission.CARE_RECOMMENDATION_GENERATE)


def _patient_or_404(user: CurrentUser, patient_id: int) -> patient_service.PatientRecord:
    record = patient_service.get_visible_patient(user, patient_id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return record


@router.get("/recommendations/{patient_id}", summary="Care recommendations for a patient")
def care_recommendations(
    patient_id: int, user: CurrentUser = Depends(_generate)
) -> dict[str, object]:
    """Return care and follow-up recommendations based on the patient's risk drivers."""
    return cds_service.recommendations(_patient_or_404(user, patient_id))


@router.get("/discharge-plan/{patient_id}", summary="Discharge support plan")
def discharge_plan(patient_id: int, user: CurrentUser = Depends(_generate)) -> dict[str, object]:
    """Return a discharge readiness assessment and mitigation steps."""
    return cds_service.discharge_plan(_patient_or_404(user, patient_id))
