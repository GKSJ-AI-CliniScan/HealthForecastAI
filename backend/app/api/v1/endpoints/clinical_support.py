"""Clinical decision support endpoints - Module 5."""

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.services.cds_service import (
    get_care_recommendations,
    get_discharge_plan,
    get_risk_drivers,
)

router = APIRouter()


@router.get(
    "/recommendations/{patient_id}",
    summary="Care recommendations for a patient",
)
def care_recommendations(
    patient_id: int,
    user: CurrentUser = Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE)),
    db=Depends(get_db),
) -> dict[str, object]:
    """Return care and follow-up recommendations."""

    recommendations, follow_up_days = get_care_recommendations(db, patient_id)
    risk_drivers, drivers_source, model_version = get_risk_drivers(db, patient_id)

    if not recommendations:
        raise HTTPException(status_code=404, detail="Patient not found")

    return {
        "patient_id": patient_id,
        "recommendations": recommendations,
        "follow_up_days": follow_up_days,
        "risk_drivers": risk_drivers,
        "drivers_source": drivers_source,
        "model_version": model_version,
    }


@router.get(
    "/discharge-plan/{patient_id}",
    summary="Discharge support plan",
)
def discharge_plan(
    patient_id: int,
    user: CurrentUser = Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE)),
    db=Depends(get_db),
) -> dict[str, object]:
    """Return discharge readiness assessment and mitigation steps."""

    risk_mitigation, ready_for_discharge = get_discharge_plan(db, patient_id)

    if not risk_mitigation:
        raise HTTPException(status_code=404, detail="Patient not found")

    return {
        "patient_id": patient_id,
        "risk_mitigation": risk_mitigation,
        "ready_for_discharge": ready_for_discharge,
    }
