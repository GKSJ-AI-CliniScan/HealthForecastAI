"""Clinical decision support endpoints - Module 5."""

from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.services.cds_service import (
    generate_care_recommendations,
    generate_discharge_plan,
)

router = APIRouter()


@router.get("/recommendations/{patient_id}", summary="Care recommendations for a patient")
def care_recommendations(
    patient_id: int,
    user: CurrentUser = Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE)),
) -> dict[str, Any]:
    """Return care and follow-up recommendations derived from patient risk drivers."""
    return generate_care_recommendations(patient_id)


@router.get("/discharge-plan/{patient_id}", summary="Discharge support plan")
def discharge_plan(
    patient_id: int,
    user: CurrentUser = Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE)),
) -> dict[str, Any]:
    """Return a discharge readiness assessment combining risk band, stay duration, and recovery response."""
    return generate_discharge_plan(patient_id)
