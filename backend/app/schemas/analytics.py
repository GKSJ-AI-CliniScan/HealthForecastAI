"""Analytics and reporting schemas."""

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


class ReadmissionTrendPoint(BaseModel):
    """One month's readmission-rate trend point."""

    month: str
    total_admissions: int = 0
    readmission_rate: float = 0.0


class PopulationHealthSummary(BaseModel):
    """Aggregated, never row-level, population statistics for researchers.

    demographic_distribution keys are "age_group"/"gender"/"race", each
    mapping to a {value: count} breakdown - never an individual record.
    """

    total_patients: int = 0
    demographic_distribution: dict[str, dict[str, int]] = Field(default_factory=dict)
    disease_prevalence: dict[str, int] = Field(default_factory=dict)


class DischargeOutcomeDistribution(BaseModel):
    """Count of admissions per discharge disposition."""

    distribution: dict[str, int] = Field(default_factory=dict)
