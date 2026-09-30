"""Clinical decision support endpoints - Module 5.

Milestone 3. Transparent rules, not a model: every recommendation names its rule,
says why, and lists the values from the record that triggered it. Everything is
flagged as needing clinician review.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.models.user import User
from app.services import auth_service, cds_service

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
CanRecommend = Annotated[User, Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE))]

NOT_FOUND = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")


@router.get("/recommendations/{patient_id}", summary="Care recommendations for a patient")
def care_recommendations(patient_id: int, user: CanRecommend, db: DbSession) -> dict[str, object]:
    """Care and follow-up recommendations, with the reasoning behind each.

    A patient outside the caller's caseload is a 404, not a 403: confirming that
    the record exists would itself be a disclosure.
    """
    context = cds_service.load_context(db, user, patient_id)
    if context is None:
        raise NOT_FOUND
    auth_service.audit_read(db, user, "cds.recommendations", f"patient:{patient_id}")
    return cds_service.recommendations(context)


@router.get("/discharge-plan/{patient_id}", summary="Discharge support plan")
def discharge_plan(patient_id: int, user: CanRecommend, db: DbSession) -> dict[str, object]:
    """A discharge checklist grouped by before, at and after discharge."""
    context = cds_service.load_context(db, user, patient_id)
    if context is None:
        raise NOT_FOUND
    auth_service.audit_read(db, user, "cds.discharge_plan", f"patient:{patient_id}")
    return cds_service.discharge_plan(context)


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
