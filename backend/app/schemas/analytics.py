"""Analytics and reporting schemas."""

from datetime import date

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


# Milestone 3: Patient outcome analytics


class OutcomeMetrics(BaseModel):
    """Aggregated patient outcome statistics."""

    total_patients: int
    readmission_rate_pct: float
    average_recovery_days: float
    complication_rate_pct: float
    mortality_rate_pct: float


class DepartmentPerformance(BaseModel):
    """Performance metrics for one hospital department."""

    department: str
    admissions_count: int
    readmission_rate_pct: float
    avg_length_of_stay: float
    performance_score: float = Field(..., ge=0, le=100)


class HospitalPerformanceResponse(BaseModel):
    """Hospital-level and department-level performance."""

    facility_name: str
    reporting_period: str
    overall_readmission_rate: float
    average_los_days: float
    bed_occupancy_rate_pct: float
    departments: list[DepartmentPerformance]


class TreatmentEffectivenessMetric(BaseModel):
    """Treatment effectiveness and associated patient outcomes."""

    treatment_name: str
    condition: str
    patient_count: int
    success_rate_pct: float
    readmission_rate_pct: float
    avg_recovery_days: float


class ReportGenerationRequest(BaseModel):
    """Parameters for generating an analytics report."""

    title: str = "Hospital Performance & Patient Outcome Report"
    start_date: date
    end_date: date
    departments: list[str] | None = None
    include_treatments: bool = True
    export_format: str = Field(
        "json",
        description="Report export format: json or pdf",
    )


class ReportGenerationResponse(BaseModel):
    """Generated patient outcome and hospital analytics report."""

    report_id: str
    generated_at: str
    summary_metrics: OutcomeMetrics
    department_breakdown: list[DepartmentPerformance]
    top_treatments: list[TreatmentEffectivenessMetric]
    download_url: str | None = None
