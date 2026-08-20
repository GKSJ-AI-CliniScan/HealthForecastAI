"""ORM models. Import every model here so Alembic autogenerate can see them."""

from app.models.admission import Admission
from app.models.audit_log import AuditLog
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome
from app.models.user import User

__all__ = [
    "Admission",
    "AuditLog",
    "Patient",
    "RiskPrediction",
    "TreatmentOutcome",
    "User",
]
