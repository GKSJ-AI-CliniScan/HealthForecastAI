"""Treatment effectiveness endpoints - Module 4."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_db, require_permission
from app.core.rbac import Permission
from app.schemas.analytics import TreatmentEffectivenessSummary
from app.services.treatment_service import (
    get_recovery_trends,
    list_treatment_effectiveness,
)

router = APIRouter()


@router.get("", response_model=list[TreatmentEffectivenessSummary])
def list_treatment_effectiveness_endpoint(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[TreatmentEffectivenessSummary]:
    """Return effectiveness rollups per treatment."""

    return list_treatment_effectiveness(db)


@router.get("/recovery-trends", summary="Recovery trend series")
def recovery_trends(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_permission(Permission.TREATMENT_REPORT_READ)),
) -> list[dict[str, float | str]]:
    """Return a recovery score time series."""

    return get_recovery_trends(db)


# docker exec healthforecast-backend python -c "from app.core.security import create_access_token; print(create_access_token(subject='doctor@hospital.example', role='hospital_admin'))"

# http://localhost:8000/api/v1/treatment

# http://localhost:8000/api/v1/treatment/recovery-trends
