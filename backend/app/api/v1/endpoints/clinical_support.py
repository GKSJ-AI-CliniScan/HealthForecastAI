"""Clinical decision support endpoints - Module 5 (Milestone 3)."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import require_permission
from app.core.rbac import Permission
from app.models.user import User

router = APIRouter()

CanRecommend = Annotated[User, Depends(require_permission(Permission.CARE_RECOMMENDATION_GENERATE))]


@router.get("/recommendations/{patient_id}", summary="Care recommendations for a patient")
def care_recommendations(patient_id: int, user: CanRecommend) -> dict[str, object]:
    """Return care and follow-up recommendations.

    TODO(milestone-3): derive recommendations from the risk drivers returned by
    the model explainer, never from raw model output alone.
    """
    return {"patient_id": patient_id, "recommendations": [], "follow_up_days": None}


@router.get("/discharge-plan/{patient_id}", summary="Discharge support plan")
def discharge_plan(patient_id: int, user: CanRecommend) -> dict[str, object]:
    """Return a discharge readiness assessment and mitigation steps.

    TODO(milestone-3): combine risk band, length of stay and treatment response.
    """
    return {"patient_id": patient_id, "risk_mitigation": [], "ready_for_discharge": None}
