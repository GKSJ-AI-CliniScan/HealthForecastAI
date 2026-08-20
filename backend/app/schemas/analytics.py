"""Analytics and reporting schemas."""

from pydantic import BaseModel


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
