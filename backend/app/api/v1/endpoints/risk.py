"""Risk prediction and readmission forecasting endpoints - Module 3.

Every route is guarded by a permission and then scoped by row, so a doctor with a
valid token still only reaches their own patients. A missing model artefact is a
503, never a zero probability dressed up as a successful answer.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import (
    VerifiedUser,
    get_db,
    require_verified_permission,
)
from app.core.rbac import Permission
from app.schemas.prediction import (
    ReadmissionForecast,
    RiskPredictionRead,
    RiskPredictionRequest,
)
from app.services import audit_service, model_service, risk_service

router = APIRouter()

_read_risk = require_verified_permission(Permission.RISK_REPORT_READ)
_read_forecast = require_verified_permission(Permission.READMISSION_FORECAST_READ)


def _model_unavailable(exc: Exception) -> HTTPException:
    """Build the 503 returned when no usable artefact is on disk."""
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))


@router.post("/predict", response_model=RiskPredictionRead, summary="Score one admission")
def predict_risk(
    payload: RiskPredictionRequest,
    request: Request,
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(_read_risk),
) -> RiskPredictionRead:
    """Return and store the readmission probability and band for one admission."""
    # WHAT      : name the attempted patient on this request's audit entry
    #             before scoping is checked, not only after scoring succeeds.
    # WHY       : this route's patient id lives in the JSON body, which the
    #             audit guard (app.api.deps) cannot see - it runs before the
    #             body is parsed. payload.patient_id is already resolved
    #             here by FastAPI, so this is the first point in the request
    #             that has it. Attaching it before calling score_admission,
    #             rather than after, means a caller who is denied by
    #             row-level scope (PatientOutOfScopeError below) still has
    #             the patient they attempted recorded - not just the ones
    #             who succeed (A6/A8).
    # FOR WHOM  : audit_service.finalize(), called by the guard once this
    #             request concludes either way.
    # BENEFIT   : the audit trail for this platform's most sensitive route
    #             names which patient was scored or attempted, matching
    #             every other guarded endpoint.
    # COST      : one call that does nothing observable if audit logging was
    #             ever removed from the guard (attach_resource() is a no-op
    #             without a stashed entry) - a silent dependency on wiring
    #             that lives in a different file.
    # ALTERNATIVES : (1) attach it only after score_admission returns, using
    #             prediction.patient_id; (2) leave resource_id empty for
    #             this route, as recorded at P2.
    # CHOSEN BECAUSE : (1) would leave a denied attempt's resource_id empty,
    #             the exact gap A6 reports for the cross-scope case; (2) is
    #             the deferral A8 reverses.
    audit_service.attach_resource(request, resource_id=str(payload.patient_id))

    try:
        prediction = risk_service.score_admission(db, caller, payload.model_dump())
    except risk_service.PatientOutOfScopeError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except model_service.ModelUnavailableError as exc:
        raise _model_unavailable(exc) from exc
    return RiskPredictionRead.model_validate(prediction)


@router.get(
    "/high-risk",
    response_model=list[RiskPredictionRead],
    summary="List patients currently in the high risk band",
)
def list_high_risk_patients(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(_read_risk),
) -> list[RiskPredictionRead]:
    """Return the high risk cohort, scoped to what the caller may see."""
    rows = risk_service.latest_predictions(db, caller, category=risk_service.RISK_HIGH, limit=limit)
    return [RiskPredictionRead.model_validate(row) for row in rows]


@router.get("/forecast", response_model=ReadmissionForecast, summary="Readmission forecast")
def readmission_forecast(
    horizon_days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    caller: VerifiedUser = Depends(_read_forecast),
) -> ReadmissionForecast:
    """Return an aggregated readmission forecast over the requested horizon."""
    return ReadmissionForecast(**risk_service.forecast(db, caller, horizon_days))
