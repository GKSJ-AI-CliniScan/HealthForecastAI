"""30-day readmission forecasting for a specific admission.

Keep API handlers thin: routers validate and authorise, services do the work.
Mirrors risk_service.RiskService's shape; kept as a separate class (rather
than a second method on RiskService) because Milestone 2 treats risk scoring
and readmission forecasting as two distinct training flows with two distinct
registered models (model_metadata.model_name = "risk" vs "readmission").
"""

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, patient_scope_for
from app.models.prediction import RiskPrediction
from app.repositories.audit_repository import AuditRepository
from app.repositories.risk_prediction_repository import RiskPredictionRepository
from app.services.admission_service import AdmissionNotFoundError, AdmissionService
from app.services.ml.feature_builder import FeatureBuilder, InsufficientPatientDataError
from app.services.ml.model_loader import ModelLoader, ModelNotAvailableError
from app.services.patient_service import PatientNotFoundError
from app.services.risk_service import READMISSION_MODEL_NAME, categorise_risk

# Only the primary horizon has ever been trained (ml/configs/config.yaml
# binarises "readmitted" against readmission_positive_label="<30" only) - the
# locked architecture's secondary 90-day horizon is a future model, not a
# client-selectable option for one that doesn't exist yet.
READMISSION_WINDOW = "30_day"


class ReadmissionService:
    """Forecasts 30-day readmission risk for a specific admission."""

    def __init__(self, db: Session) -> None:
        self.admissions = AdmissionService(db)
        self.predictions = RiskPredictionRepository(db)
        self.features = FeatureBuilder(db)
        self.loader = ModelLoader(db)
        self.audit = AuditRepository(db)

    def predict(
        self, user: CurrentUser, patient_id: int, admission_id: int
    ) -> RiskPrediction:
        """Build features, run inference, persist and return the forecast.

        Raises PatientNotFoundError, AdmissionNotFoundError,
        InsufficientPatientDataError or ModelNotAvailableError - the endpoint
        translates each into the matching HTTP response.
        """
        admission = self.admissions.get_admission(user, patient_id, admission_id)
        patient = self.admissions.patients.get_patient(user, patient_id)

        feature_row = self.features.build_for_patient(patient, admission=admission)
        pipeline, model_record = self.loader.get_production_pipeline(
            READMISSION_MODEL_NAME
        )

        probability = float(pipeline.predict_proba(feature_row)[:, 1][0])
        confidence = float(max(probability, 1 - probability))
        category = categorise_risk(probability)

        record = self.predictions.create(
            patient_id=patient.id,
            admission_id=admission.id,
            readmission_probability=probability,
            risk_category=category,
            prediction_type="readmission",
            confidence_score=confidence,
            readmission_window=READMISSION_WINDOW,
            model_name=model_record.model_name,
            model_version=model_record.version,
        )
        self.audit.record(
            action="readmission.predict",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"admission:{admission.id}",
        )
        return record

    def forecast_summary(self, user: CurrentUser) -> dict[str, float | int | str]:
        """Return an aggregated readmission forecast, scoped to the caller's role.

        Doctors see their own assigned patients; every other permitted role
        (hospital_admin, system_admin) sees the hospital-wide figure - the
        same scoping rule PatientRepository.scope_clause applies elsewhere.
        """
        doctor_id = patient_scope_for(user)
        predicted, total = self.predictions.readmission_forecast_summary(
            doctor_id=doctor_id
        )
        rate = predicted / total if total else 0.0
        return {
            "scope": "doctor" if doctor_id is not None else "hospital",
            "horizon_days": 30,
            "predicted_readmissions": predicted,
            "predicted_rate": rate,
        }


__all__ = [
    "READMISSION_WINDOW",
    "AdmissionNotFoundError",
    "InsufficientPatientDataError",
    "ModelNotAvailableError",
    "PatientNotFoundError",
    "ReadmissionService",
]
