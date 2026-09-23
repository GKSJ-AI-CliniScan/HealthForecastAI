"""Clinical decision support endpoints - Module 5."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.schemas.cds import CareRecommendationsRead, DischargePlanRead
from app.services.cds_service import (
    CDSService,
    NoRiskPredictionError,
    PatientNotFoundError,
)

router = APIRouter()

_generate_recommendations = require_permission(Permission.CARE_RECOMMENDATION_GENERATE)


def _patient_not_found(patient_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"No patient with id {patient_id}"
    )


def _no_prediction(patient_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=(
            f"No risk prediction exists yet for patient {patient_id}. "
            "Call POST /risk/predict first."
        ),
    )


@router.get(
    "/recommendations/{patient_id}",
    response_model=CareRecommendationsRead,
    summary="Care recommendations for a patient",
)
def care_recommendations(
    patient_id: int,
    user: CurrentUser = Depends(_generate_recommendations),
    db: Session = Depends(get_db),
) -> CareRecommendationsRead:
    """Return deterministic, rule-based care and follow-up recommendations."""
    try:
        payload = CDSService(db).care_recommendations(user, patient_id)
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
    except NoRiskPredictionError as exc:
        raise _no_prediction(patient_id) from exc
    return CareRecommendationsRead.model_validate(payload)


@router.get(
    "/discharge-plan/{patient_id}",
    response_model=DischargePlanRead,
    summary="Discharge support plan",
)
def discharge_plan(
    patient_id: int,
    user: CurrentUser = Depends(_generate_recommendations),
    db: Session = Depends(get_db),
) -> DischargePlanRead:
    """Return a discharge readiness assessment and risk mitigation steps."""
    try:
        payload = CDSService(db).discharge_plan(user, patient_id)
    except PatientNotFoundError as exc:
        raise _patient_not_found(patient_id) from exc
    except NoRiskPredictionError as exc:
        raise _no_prediction(patient_id) from exc
    return DischargePlanRead.model_validate(payload)
