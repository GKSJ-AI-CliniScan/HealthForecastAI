"""treatment service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.

Every analytics read is narrowed by patient_scope_for: a doctor holds only
TREATMENT_REPORT_READ_LIMITED, so their figures cover their own patients,
while roles holding the full TREATMENT_REPORT_READ see hospital-wide figures.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, patient_scope_for
from app.models.treatment import TreatmentOutcome
from app.repositories.audit_repository import AuditRepository
from app.repositories.treatment_repository import (
    DepartmentEffectivenessRow,
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


class TreatmentNotFoundError(Exception):
    """Raised when no outcome has been recorded for a treatment in the caller's scope."""


class TreatmentService:
    """Treatment effectiveness recording and analytics."""

    def __init__(self, db: Session) -> None:
        self.treatments = TreatmentRepository(db)
        self.admissions = AdmissionService(db)
        self.audit = AuditRepository(db)

    def _audit_read(self, user: CurrentUser, action: str, resource: str | None = None) -> None:
        self.audit.record(
            action=action,
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=resource[:128] if resource else None,
        )

    def record_outcome(
        self, user: CurrentUser, patient_id: int, admission_id: int, values: dict[str, Any]
    ) -> TreatmentOutcome:
        """Record a treatment outcome for an admission the caller may see.

        Raises PatientNotFoundError / AdmissionNotFoundError - the same scope
        rules every other admission write already enforces.
        """
        self.admissions.get_admission(user, patient_id, admission_id)  # scope check
        record = self.treatments.create(admission_id=admission_id, **values)
        self.audit.record(
            action="treatment.record",
            actor_id=user.user_id,
            actor_role=str(user.role),
            resource=f"admission:{admission_id}",
        )
        return record

    def list_outcomes(
        self, user: CurrentUser, patient_id: int, admission_id: int
    ) -> list[TreatmentOutcome]:
        """Outcomes recorded for one admission, after the usual scope check."""
        self.admissions.get_admission(user, patient_id, admission_id)
        self._audit_read(user, "treatment.list", f"admission:{admission_id}")
        return self.treatments.list_for_admission(admission_id)

    def list_effectiveness(
        self,
        user: CurrentUser,
        treatment_name: str | None = None,
        department: str | None = None,
    ) -> list[TreatmentRateRow]:
        """Recovery/success rollups per treatment."""
        self._audit_read(user, "treatment.effectiveness")
        return self.treatments.rates_by_treatment(
            treatment_name, department, doctor_id=patient_scope_for(user)
        )

    def outcome_distribution(
        self,
        user: CurrentUser,
        treatment_name: str | None = None,
        department: str | None = None,
    ) -> list[tuple[str, dict[str, int]]]:
        """Outcome counts per treatment (FR-ANL-02 outcome-vs-treatment cross-tab)."""
        self._audit_read(user, "treatment.outcome_distribution")
        return self.treatments.outcome_distribution(
            treatment_name, department, doctor_id=patient_scope_for(user)
        )

    def department_effectiveness(self, user: CurrentUser) -> list[DepartmentEffectivenessRow]:
        """Treatment effectiveness grouped by admission department."""
        self._audit_read(user, "treatment.department_effectiveness")
        return self.treatments.effectiveness_by_department(doctor_id=patient_scope_for(user))

    def recovery_trends(
        self, user: CurrentUser, treatment_name: str | None = None, weeks: int = 12
    ) -> list[RecoveryTrendPoint]:
        """Weekly recovery-score trend."""
        self._audit_read(user, "treatment.recovery_trend")
        return self.treatments.recovery_trend(
            treatment_name, weeks, doctor_id=patient_scope_for(user)
        )

    def readmission_reduction(self, user: CurrentUser, treatment_name: str) -> dict[str, Any]:
        """Compare one treatment's readmission rate against the baseline in the same scope.

        Raises TreatmentNotFoundError when the treatment has no recorded
        outcomes - a 0.0 rate over zero admissions would read as a perfect
        result rather than as "no data".
        """
        doctor_id = patient_scope_for(user)
        readmitted, total = self.treatments.readmission_rate_for_treatment(
            treatment_name, doctor_id=doctor_id
        )
        if total == 0:
            raise TreatmentNotFoundError(treatment_name)
        baseline_readmitted, baseline_total = self.treatments.hospital_readmission_rate(
            doctor_id=doctor_id
        )
        self._audit_read(user, "treatment.readmission_reduction", f"treatment:{treatment_name}")
        return {
            "treatment_name": treatment_name,
            "treatment_readmission_rate": readmitted / total,
            "hospital_baseline_readmission_rate": (
                baseline_readmitted / baseline_total if baseline_total else 0.0
            ),
            "sample_size": total,
        }

    def compare_treatments(
        self,
        user: CurrentUser,
        diagnosis: str,
        min_sample_size: int = MIN_COMPARISON_SAMPLE_SIZE,
    ) -> list[TreatmentComparisonRow]:
        """Compare treatments applied within one diagnosis cohort.

        Raises CohortTooSmallError when fewer than min_sample_size treatment
        records exist for the diagnosis within the caller's scope.
        """
        doctor_id = patient_scope_for(user)
        total = self.treatments.total_for_diagnosis(diagnosis, doctor_id=doctor_id)
        if total < min_sample_size:
            raise CohortTooSmallError(size=total, minimum=min_sample_size)
        self._audit_read(user, "treatment.compare", f"diagnosis:{diagnosis}")
        return self.treatments.compare_by_diagnosis(diagnosis, doctor_id=doctor_id)

    def outcome_trend(self, user: CurrentUser, months: int = 12) -> list[dict[str, Any]]:
        """Monthly outcome breakdown for the unified analytics trend endpoint."""
        return self.treatments.outcome_trend(months, doctor_id=patient_scope_for(user))


__all__ = [
    "AdmissionNotFoundError",
    "CohortTooSmallError",
    "MIN_COMPARISON_SAMPLE_SIZE",
    "PatientNotFoundError",
    "TreatmentNotFoundError",
    "TreatmentService",
]
