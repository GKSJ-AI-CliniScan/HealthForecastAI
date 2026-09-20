"""Analytics and reporting schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class RiskDistribution(BaseModel):
    """Count of patients per risk band."""

    low: int = 0
    medium: int = 0
    high: int = 0


class HospitalAnalyticsSummary(BaseModel):
    """Top level KPIs for the hospital administrator dashboard."""

    total_patients: int = 0
    total_admissions: int = 0
    readmission_rate: float = 0.0
    average_length_of_stay: float = 0.0
    risk_distribution: RiskDistribution = RiskDistribution()


class TreatmentEffectivenessSummary(BaseModel):
    """Effectiveness rollup for one treatment."""

    treatment_name: str
    patients_treated: int = 0
    average_recovery_score: float = 0.0
    readmission_rate: float = 0.0


class RecoveryTrend(BaseModel):
    """Weekly recovery trend."""

    week: str
    average_recovery_score: float = 0.0


class ReadmissionTrend(BaseModel):
    """Monthly readmission trend."""

    period: str
    admissions: int = 0
    readmissions: int = 0
    readmission_rate: float = 0.0


class PopulationHealthCohort(BaseModel):
    """Aggregated population-health cohort."""

    age_group: str | None = None
    patient_count: int = 0
    admission_count: int = 0
    readmission_rate: float = 0.0


class PopulationHealthResponse(BaseModel):
    """Aggregated population-health response."""

    cohorts: list[PopulationHealthCohort] = Field(default_factory=list)
    generated_at: datetime | None = None


class MedicationOutcomeSummary(BaseModel):
    medication_change: bool
    patients_treated: int = 0
    average_recovery_score: float = 0.0
    readmission_rate: float = 0.0
    improved_count: int = 0
    stable_count: int = 0
    partial_recovery_count: int = 0
