"""Clinical decision support endpoints - Module 5."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, require_permission
from app.core.rbac import Permission
from app.db.session import get_db
from app.services import cds_service

router = APIRouter()


@router.get("/recommendations/{patient_id}", summary="Care recommendations for a patient")
def care_recommendations(
    patient_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE)),
) -> list[str]:
    return cds_service.get_care_recommendations(db, patient_id)


@router.get("/discharge-plan/{patient_id}", summary="Discharge support plan")
def discharge_plan(
    patient_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE)),
) -> dict:
    return cds_service.get_discharge_plan(db, patient_id)