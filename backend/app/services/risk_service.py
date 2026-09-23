"""Risk scoring: shared banding logic and the patient risk-score service.

Keep API handlers thin: routers validate and authorise, services do the work.
"""

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, patient_scope_for
from app.core.config import settings
from app.models.prediction import RiskPrediction
from app.repositories.audit_repository import AuditRepository
from app.repositories.risk_prediction_repository import RiskPredictionRepository
from app.services.ml.feature_builder import FeatureBuilder, InsufficientPatientDataError
from app.services.ml.model_loader import ModelLoader, ModelNotAvailableError
from app.services.patient_service import PatientNotFoundError, PatientService

RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"

# model_metadata.model_name for the two trained flows (ml/src/models/train.py's
# TARGET_BUILDERS keys) - a fixed pair, not environment configuration, so these
# are constants rather than settings.
RISK_MODEL_NAME = "risk"
READMISSION_MODEL_NAME = "readmission"


def categorise_risk(probability: float) -> str:
    """Map a readmission probability onto the platform's three risk bands."""
    if not 0.0 <= probability <= 1.0:
        raise ValueError("probability must be between 0.0 and 1.0")
    if probability >= settings.RISK_THRESHOLD_HIGH:
        return RISK_HIGH
    if probability >= settings.RISK_THRESHOLD_MEDIUM:
        return RISK_MEDIUM
    return RISK_LOW


class NoPredictionError(Exception):
    """Raised when a patient has no prediction of the requested type yet."""


class RiskService:
    """Scores a patient's general risk and serves their prediction history."""

    def __init__(self, db: Session) -> None:
        self.patients = PatientService(db)
        self.predictions = RiskPredictionRepository(db)
        self.features = FeatureBuilder(db)
        self.loader = ModelLoader(db)
        self.audit = AuditRepository(db)

    def score_patient(self, user: CurrentUser, patient_id: int) -> RiskPrediction:
        """Build features, run inference, persist and return the result.

        Raises PatientNotFoundError (missing/out of scope),
        InsufficientPatientDataError (not enough history to score) or
        ModelNotAvailableError (no production model registered) - the
        endpoint translates each into the matching HTTP response.
        """
        patient = self.patients.get_patient(user, patient_id)
        feature_row = self.features.build_for_patient(patient)
        pipeline, model_record = self.loader.get_production_pipeline(RISK_MODEL_NAME)

        probability = float(pipeline.predict_proba(feature_row)[:, 1][0])
        category = categorise_risk(probability)

        record = self.predictions.create(
            patient_id=patient.id,
            admission_id=None,
            readmission_probability=probability,
            risk_category=category,
            prediction_type="risk",
            model_name=model_record.model_name,
            model_version=model_record.version,
        )
        self.audit.record(
            action="risk.predict",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"patient:{patient.id}",
        )
        return record

    def latest(
        self, user: CurrentUser, patient_id: int, prediction_type: str = "risk"
    ) -> RiskPrediction:
        """Return a patient's most recent prediction of one type."""
        self.patients.get_patient(user, patient_id)  # scope check + audit
        record = self.predictions.latest_for_patient(patient_id, prediction_type=prediction_type)
        if record is None:
            raise NoPredictionError(str(patient_id))
        return record

    def history(
        self,
        user: CurrentUser,
        patient_id: int,
        prediction_type: str = "risk",
        limit: int = 50,
    ) -> list[RiskPrediction]:
        """Return a patient's prediction trend of one type, newest first."""
        self.patients.get_patient(user, patient_id)  # scope check + audit
        return self.predictions.history_for_patient(
            patient_id, prediction_type=prediction_type, limit=limit
        )

    def list_high_risk(self, user: CurrentUser, limit: int = 100) -> list[RiskPrediction]:
        """Return the current high-risk cohort, scoped to the caller's role."""
        doctor_id = patient_scope_for(user)
        return self.predictions.list_high_risk(
            prediction_type="risk", doctor_id=doctor_id, limit=limit
        )


__all__ = [
    "RISK_HIGH",
    "RISK_LOW",
    "RISK_MEDIUM",
    "RISK_MODEL_NAME",
    "READMISSION_MODEL_NAME",
    "InsufficientPatientDataError",
    "ModelNotAvailableError",
    "NoPredictionError",
    "PatientNotFoundError",
    "RiskService",
    "categorise_risk",
]
