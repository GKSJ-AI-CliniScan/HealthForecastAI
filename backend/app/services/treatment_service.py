"""treatment service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.models.treatment import TreatmentOutcome
from app.repositories.audit_repository import AuditRepository
from app.repositories.treatment_repository import (
    RecoveryTrendPoint,
    TreatmentComparisonRow,
    TreatmentRateRow,
    TreatmentRepository,
)
from app.services.admission_service import AdmissionNotFoundError, AdmissionService
from app.services.patient_service import CohortTooSmallError, PatientNotFoundError

# The M3 design's stated guard: refuse a treatment comparison over a
# handful of rows rather than let it imply a conclusion the sample can't
# support - the same "refuse rather than mislead" principle
# PatientService.list_for_research applies to a small research cohort.
MIN_COMPARISON_SAMPLE_SIZE = 5


class TreatmentService:
    """Treatment effectiveness recording and analytics."""

    def __init__(self, db: Session) -> None:
        self.treatments = TreatmentRepository(db)
        self.admissions = AdmissionService(db)
        self.audit = AuditRepository(db)

    def record_outcome(
        self, user: CurrentUser, patient_id: int, admission_id: int, values: dict[str, Any]
    ) -> TreatmentOutcome:
        """Record a treatment outcome for an admission the caller may see.

        Raises PatientNotFoundError / AdmissionNotFoundError - the same scope
        rules every other admission write already enforces.
        """
        self.admissions.get_admission(user, patient_id, admission_id)  # scope check + audit
        record = self.treatments.create(admission_id=admission_id, **values)
        self.audit.record(
            action="treatment.record",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"admission:{admission_id}",
        )
        return record

    def list_effectiveness(
        self, treatment_name: str | None = None, department: str | None = None
    ) -> list[TreatmentRateRow]:
        """Recovery/success rollups per treatment."""
        return self.treatments.rates_by_treatment(treatment_name, department)

    def recovery_trends(
        self, treatment_name: str | None = None, weeks: int = 12
    ) -> list[RecoveryTrendPoint]:
        """Weekly recovery-score trend."""
        return self.treatments.recovery_trend(treatment_name, weeks)

    def readmission_reduction(self, treatment_name: str) -> dict[str, Any]:
        """Compare one treatment's readmission rate against the hospital baseline."""
        readmitted, total = self.treatments.readmission_rate_for_treatment(treatment_name)
        baseline_readmitted, baseline_total = self.treatments.hospital_readmission_rate()
        return {
            "treatment_name": treatment_name,
            "treatment_readmission_rate": readmitted / total if total else 0.0,
            "hospital_baseline_readmission_rate": (
                baseline_readmitted / baseline_total if baseline_total else 0.0
            ),
            "sample_size": total,
        }

    def compare_treatments(
        self, diagnosis: str, min_sample_size: int = MIN_COMPARISON_SAMPLE_SIZE
    ) -> list[TreatmentComparisonRow]:
        """Compare treatments applied within one diagnosis cohort.

        Raises CohortTooSmallError when fewer than min_sample_size treatment
        records exist for the diagnosis.
        """
        total = self.treatments.total_for_diagnosis(diagnosis)
        if total < min_sample_size:
            raise CohortTooSmallError(size=total, minimum=min_sample_size)
        return self.treatments.compare_by_diagnosis(diagnosis)


__all__ = [
    "AdmissionNotFoundError",
    "CohortTooSmallError",
    "MIN_COMPARISON_SAMPLE_SIZE",
    "PatientNotFoundError",
    "TreatmentService",
]
