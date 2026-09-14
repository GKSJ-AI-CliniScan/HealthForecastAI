"""Risk scoring helpers shared by the API and the batch jobs."""

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, patient_scope_for
from app.core.config import settings
from app.core.rbac import Role
from app.models.prediction import RiskPrediction
from app.repositories.risk_repository import RiskRepository
from app.schemas.prediction import ReadmissionForecast, RiskPredictionRequest
from app.services.model_service import MODEL_VERSION, predict_readmission
from app.services.patient_service import PatientNotFoundError, PatientService

RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"

# Forecast horizon bounds, shared with the reporting layer so both surfaces
# accept exactly the same range. report_service imports these rather than
# restating them.
MIN_HORIZON_DAYS = 1
MAX_HORIZON_DAYS = 365

# The window the model was actually trained to predict. Any other horizon is a
# linear rescale of this base rate.
MODEL_HORIZON_DAYS = 30


class InvalidForecastRequestError(Exception):
    """Raised when forecast parameters are outside the supported range."""


def validate_horizon(horizon_days: int) -> int:
    """Return the horizon unchanged, or raise when it is implausible.

    Routers map this to 422. Without it a negative horizon produced a negative
    rate, which then failed the response model's ge=0.0 constraint and surfaced
    as a 500 instead of a validation error.
    """
    if horizon_days < MIN_HORIZON_DAYS or horizon_days > MAX_HORIZON_DAYS:
        raise InvalidForecastRequestError(
            f"horizon_days must be between {MIN_HORIZON_DAYS} and "
            f"{MAX_HORIZON_DAYS}, got {horizon_days}"
        )
    return horizon_days


def scope_label(user: CurrentUser) -> str:
    """Describe how wide the caller's view of the data actually is.

    Returned in the forecast body so a response cannot be mistaken for a wider
    scope than it was computed over.
    """
    if user.role is Role.DOCTOR:
        return "assigned_patients"
    if user.role is Role.RESEARCHER:
        return "aggregated"
    return "hospital"


def categorise_risk(probability: float) -> str:
    """Map a readmission probability onto the platform's three risk bands."""
    if not 0.0 <= probability <= 1.0:
        raise ValueError("probability must be between 0.0 and 1.0")
    if probability >= settings.RISK_THRESHOLD_HIGH:
        return RISK_HIGH
    if probability >= settings.RISK_THRESHOLD_MEDIUM:
        return RISK_MEDIUM
    return RISK_LOW


def score_and_save(
    db: Session, payload: RiskPredictionRequest, user: CurrentUser
) -> RiskPrediction:
    """Run the model, categorise the result, and persist it.

    The patient is resolved through PatientService first, which raises
    PatientNotFoundError when the record does not exist or lies outside the
    caller's scope. That check runs before the model is invoked, so a refused
    request neither scores nor writes a row - a doctor cannot create a
    prediction against another doctor's patient. Roles the access matrix grants
    hospital wide reads are unaffected: patient_scope_for returns None for them
    and every existing patient stays reachable.
    """
    PatientService(db).get_patient(user, payload.patient_id)

    probability = predict_readmission(
        time_in_hospital=payload.time_in_hospital,
        num_medications=payload.num_medications,
        num_lab_procedures=payload.num_lab_procedures,
        number_diagnoses=payload.number_diagnoses,
        number_inpatient=payload.number_inpatient,
        number_emergency=payload.number_emergency,
        age_group=payload.age_group,
    )

    record = RiskPrediction(
        patient_id=payload.patient_id,
        readmission_probability=probability,
        risk_category=categorise_risk(probability),
        model_name=settings.ACTIVE_RISK_MODEL,
        model_version=MODEL_VERSION,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_high_risk_patients(db: Session, user: CurrentUser) -> list[RiskPrediction]:
    """Return each patient's most recent prediction, filtered to the high band.

    Scope is delegated to RiskRepository, which narrows through
    PatientRepository.scope_clause - the same predicate the patient endpoints
    use. A doctor therefore sees their primary assignments and the patients
    granted to them through doctor_patient_map; filtering on
    patients.assigned_doctor_id alone used to hide co-managed patients from the
    clinician responsible for them.

    Roles the access matrix grants hospital wide reads get doctor_id None, which
    means "do not narrow", so their result is unchanged.
    """
    doctor_id = patient_scope_for(user)
    return RiskRepository(db).list_latest_by_category(RISK_HIGH, doctor_id=doctor_id)


def get_readmission_forecast(
    db: Session, horizon_days: int, user: CurrentUser
) -> ReadmissionForecast:
    """Project expected readmissions over the patients the caller may see.

    Scope is delegated to RiskRepository, which narrows through
    PatientRepository.scope_clause - so a doctor forecasts over their own
    caseload, including patients granted through doctor_patient_map, rather than
    over the whole hospital. Roles the access matrix grants hospital wide reads
    get doctor_id None, which means "do not narrow".

    The model predicts a 30-day readmission probability, so a horizon other than
    30 days is a linear scale of that base rate - a simplification, not a true
    time-series forecast. Documented as a known limitation.
    """
    validate_horizon(horizon_days)

    doctor_id = patient_scope_for(user)
    records = RiskRepository(db).list_latest(doctor_id=doctor_id)
    total_scored = len(records)
    scope = scope_label(user)

    if total_scored == 0:
        return ReadmissionForecast(
            scope=scope,
            horizon_days=horizon_days,
            predicted_readmissions=0,
            predicted_rate=0.0,
        )

    base_rate_30d = sum(r.readmission_probability for r in records) / total_scored
    scaling_factor = horizon_days / MODEL_HORIZON_DAYS
    predicted_rate = min(base_rate_30d * scaling_factor, 1.0)
    predicted_readmissions = round(predicted_rate * total_scored)

    return ReadmissionForecast(
        scope=scope,
        horizon_days=horizon_days,
        predicted_readmissions=predicted_readmissions,
        predicted_rate=round(predicted_rate, 4),
    )


__all__ = [
    "MAX_HORIZON_DAYS",
    "MIN_HORIZON_DAYS",
    "InvalidForecastRequestError",
    "PatientNotFoundError",
    "RISK_HIGH",
    "RISK_LOW",
    "RISK_MEDIUM",
    "categorise_risk",
    "get_high_risk_patients",
    "get_readmission_forecast",
    "score_and_save",
    "scope_label",
    "validate_horizon",
]
