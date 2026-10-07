"""Clinical decision support endpoints - Module 5 (Milestone 3)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.core.rbac import Permission
from app.models.patient import Patient
from app.models.user import User
from app.services import cds_service

router = APIRouter()

CanRecommend = Annotated[User, Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE))]


@router.get("/recommendations/{patient_id}", summary="Care recommendations for a patient")
def care_recommendations(
    patient_id: int, user: CanRecommend, db: Session = Depends(get_db)
) -> dict[str, object]:
    """Return care and follow-up recommendations derived from patient risk profile."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return cds_service.generate_care_recommendations(db, patient_id)


@router.get("/discharge-plan/{patient_id}", summary="Discharge support plan")
def discharge_plan(
    patient_id: int, user: CanRecommend, db: Session = Depends(get_db)
) -> dict[str, object]:
    """Return a discharge readiness assessment and risk mitigation steps."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return cds_service.generate_discharge_plan(db, patient_id)

