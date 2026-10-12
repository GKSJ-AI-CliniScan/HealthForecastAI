"""Clinical decision support endpoints - Module 5.

Milestone 3. Transparent rules, not a model: every recommendation names its rule,
says why, and lists the values from the record that triggered it. Everything is
flagged as needing clinician review.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.core.rbac import Permission, Role
from app.models.patient import Patient
from app.models.user import User
from app.services import auth_service, cds_service

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
CanRecommend = Annotated[User, Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE))]


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

NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")


@router.get("/recommendations/{patient_id}", summary="Care recommendations for a patient")
def care_recommendations(
    patient_id: int,
    user: CanRecommend,
    db: DbSession,
    persist: bool = Query(default=True, description="Save insights onto the latest prediction"),
) -> dict[str, object]:
    """Care and follow-up recommendations derived from the patient's risk profile."""
    _ensure_visible(db, user, patient_id)
    context = cds_service.load_context(db, user, patient_id)
    if context is None:
        raise NOT_FOUND
    auth_service.audit_read(db, user, "cds.recommendations", f"patient:{patient_id}")
    res = cds_service.recommendations(context)
    m3 = cds_service.generate_care_recommendations(db, patient_id, persist=persist)
    return {
        **res,
        "model_scored": m3.get("model_scored", context.probability is not None),
        "risk_category": m3.get("risk_category", context.band),
        "readmission_probability": m3.get("readmission_probability", context.probability),
        "clinical_insights": m3.get("clinical_insights"),
        "persisted": m3.get("persisted", False),
    }


@router.get("/discharge-plan/{patient_id}", summary="Discharge support plan")
def discharge_plan(
    patient_id: int,
    user: CanRecommend,
    db: DbSession,
    persist: bool = Query(default=True, description="Save insights onto the latest prediction"),
) -> dict[str, object]:
    """A discharge checklist grouped by before, at and after discharge."""
    _ensure_visible(db, user, patient_id)
    context = cds_service.load_context(db, user, patient_id)
    if context is None:
        raise NOT_FOUND
    auth_service.audit_read(db, user, "cds.discharge_plan", f"patient:{patient_id}")
    plan = cds_service.discharge_plan(context)
    m3_discharge = cds_service.generate_discharge_plan(db, patient_id, persist=persist)
    return {
        **plan,
        "ready_for_discharge": m3_discharge.get("ready_for_discharge"),
        "readiness_score": m3_discharge.get("readiness_score"),
        "risk_mitigation": m3_discharge.get("risk_mitigation"),
        "checklist": m3_discharge.get("checklist"),
        "clinical_insights": m3_discharge.get("clinical_insights"),
        "model_scored": m3_discharge.get("model_scored", context.probability is not None),
        "risk_category": m3_discharge.get("risk_category", context.band),
        "persisted": m3_discharge.get("persisted", False),
    }


@router.get("/rules", summary="The rule set and its thresholds")
def rules(user: CanRecommend) -> dict[str, object]:
    """Publish the rules and thresholds, so a clinician can review exactly what runs."""
    return {
        "version": cds_service.RULES_VERSION,
        "thresholds": cds_service.THRESHOLDS,
        "disclaimer": cds_service.DISCLAIMER,
        "rules": [
            {
                "id": rule.id,
                "category": rule.category,
                "priority": rule.priority,
                "timing": rule.timing,
                "action": rule.action,
            }
            for rule in cds_service.RULES
        ],
    }
