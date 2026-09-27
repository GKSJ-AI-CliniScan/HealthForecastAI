"""analytics service - business logic layer.

Keep API handlers thin: routers validate and authorise, services do the work.
"""

from typing import Any

from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, patient_scope_for
from app.core.config import settings
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.risk_prediction_repository import RiskPredictionRepository
from app.schemas.analytics import HospitalAnalyticsSummary, RiskDistribution
from app.services.patient_service import CohortTooSmallError


class AnalyticsService:
    """Hospital-wide, department and population analytics."""

    def __init__(self, db: Session) -> None:
        self.analytics = AnalyticsRepository(db)
        self.risk_predictions = RiskPredictionRepository(db)
        self.audit = AuditRepository(db)

    def hospital_summary(self, user: CurrentUser) -> HospitalAnalyticsSummary:
        """Headline KPIs, scoped per the RBAC matrix's "Doctor: Limited" rule.

        A doctor's figures are narrowed to their own assigned patients by
        reusing patient_scope_for - the identical rule PatientService applies
        - rather than a separate analytics-specific scoping concept.
        """
        doctor_id = patient_scope_for(user)
        total_patients, total_admissions, average_length_of_stay = self.analytics.admission_stats(
            doctor_id
        )
        readmission_rate = self.analytics.readmission_rate(doctor_id)
        distribution = self.risk_predictions.risk_category_distribution(doctor_id)

        self.audit.record(
            action="analytics.hospital_summary",
            actor_id=user.user_id,
            actor_role=str(user.role),
        )
        return HospitalAnalyticsSummary(
            total_patients=total_patients,
            total_admissions=total_admissions,
            readmission_rate=readmission_rate,
            average_length_of_stay=average_length_of_stay,
            risk_distribution=RiskDistribution(**distribution),
        )

    def readmission_analytics(self, user: CurrentUser, months: int = 12) -> list[dict[str, Any]]:
        """Monthly readmission trend, scoped the same way hospital_summary is."""
        doctor_id = patient_scope_for(user)
        self.audit.record(
            action="analytics.readmission_trend",
            actor_id=user.user_id,
            actor_role=str(user.role),
        )
        return self.analytics.readmission_trend(doctor_id, months)

    def discharge_outcomes(self, user: CurrentUser) -> dict[str, int]:
        """Discharge-disposition distribution, scoped the same way hospital_summary is."""
        doctor_id = patient_scope_for(user)
        return self.analytics.discharge_outcome_distribution(doctor_id)

    def population_health(
        self, user: CurrentUser, min_cohort_size: int | None = None
    ) -> dict[str, Any]:
        """Aggregated, never row-level, population statistics for researchers.

        Raises CohortTooSmallError when the hospital-wide patient count is
        below the configured minimum - the same guard
        PatientService.list_for_research applies to the row-level export.
        """
        minimum = (
            min_cohort_size if min_cohort_size is not None else settings.RESEARCH_MIN_COHORT_SIZE
        )
        total_patients = self.analytics.total_patient_count()
        if total_patients < minimum:
            self.audit.record(
                action="analytics.population_health",
                actor_id=user.user_id,
                actor_role=str(user.role),
                outcome="failure",
            )
            raise CohortTooSmallError(size=total_patients, minimum=minimum)

        demographic_distribution = self.analytics.demographic_distribution()
        disease_prevalence = dict(self.analytics.disease_prevalence(limit=20))

        self.audit.record(
            action="analytics.population_health",
            actor_id=user.user_id,
            actor_role=str(user.role),
        )
        return {
            "total_patients": total_patients,
            "demographic_distribution": demographic_distribution,
            "disease_prevalence": disease_prevalence,
        }


__all__ = ["AnalyticsService", "CohortTooSmallError"]
