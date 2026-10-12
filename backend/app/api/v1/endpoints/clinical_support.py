"""Clinical decision support endpoints - Module 5 (Milestone 3)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.core.rbac import Permission, Role
from app.models.patient import Patient
from app.models.user import User
from app.services import cds_service

router = APIRouter()

CanRecommend = Annotated[User, Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE))]
DbSession = Annotated[Session, Depends(get_db)]


def _ensure_visible(db: Session, actor: User, patient_id: int) -> None:
    """Raise 404 when the record is missing or belongs to another doctor."""
    patient = db.get(Patient, patient_id)
    if patient is None or (actor.role == Role.DOCTOR and patient.assigned_doctor_id != actor.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")


@router.get("/insights", summary="Latest score and saved insights for the visible cohort")
def cohort_insights(
    user: CanRecommend,
    db: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict[str, object]:
    """Return one row per patient the caller may see, newest score first.

    One request for the whole hub page. Patients with no stored prediction are
    listed as unscored rather than omitted, so an unscored cohort reads as
    unscored instead of empty.
    """
    items, total = cds_service.list_patient_insights(db, user, limit=limit, offset=offset)
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
        "model": cds_service.active_model_summary(),
    }


@router.get("/insights/{patient_id}", summary="Retrieve persisted clinical insights")
def get_clinical_insights(
    patient_id: int,
    user: CanRecommend,
    db: DbSession,
) -> dict[str, object]:
    """Return the patient's latest score and any saved insights.

    Absence is a normal state here, so it comes back as `insights: null` with
    `model_scored: false` instead of an error. Generate and save with
    /recommendations or /discharge-plan.
    """
    item = cds_service.patient_insights(db, user, patient_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return {**item, "model": cds_service.active_model_summary()}


@router.get("/recommendations/{patient_id}", summary="Care recommendations for a patient")
def care_recommendations(
    patient_id: int,
    user: CanRecommend,
    db: DbSession,
    persist: bool = Query(default=True, description="Save insights onto the latest prediction"),
) -> dict[str, object]:
    """Return care and follow-up recommendations derived from the patient's risk profile.

    Without a stored prediction there is no row to save against, so the response
    says `persisted: false` and hands back the text unsaved.
    """
    _ensure_visible(db, user, patient_id)
    return cds_service.generate_care_recommendations(db, patient_id, persist=persist)


@router.get("/discharge-plan/{patient_id}", summary="Discharge support plan")
def discharge_plan(
    patient_id: int,
    user: CanRecommend,
    db: DbSession,
    persist: bool = Query(default=True, description="Save insights onto the latest prediction"),
) -> dict[str, object]:
    """Return a discharge readiness assessment and risk mitigation steps."""
    _ensure_visible(db, user, patient_id)
    return cds_service.generate_discharge_plan(db, patient_id, persist=persist)
