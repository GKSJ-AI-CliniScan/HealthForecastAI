"""Analytics and reporting schemas."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

TrendMetric = Literal["outcome", "risk"]
DepartmentSortField = Literal[
    "department", "total_admissions", "readmission_rate", "average_length_of_stay"
]
SortOrder = Literal["asc", "desc"]


class DateRange(BaseModel):
    """Inclusive admission-date window. Either bound may be open."""

    date_from: date | None = None
    date_to: date | None = None


class ResearchCohortFilter(DateRange):
    """Filters a researcher may narrow an anonymised cohort by (SRS use case
    "Export Anonymized Research Dataset": condition, date range, demographics
    bucket). age_band matches the generalised band researchers are shown,
    never the raw stored age."""

    diagnosis: str | None = None
    gender: str | None = None
    age_band: str | None = None


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


class DepartmentAnalytics(BaseModel):
    """Admission volume and outcome figures for one hospital department."""

    department: str
    total_patients: int = 0
    total_admissions: int = 0
    average_length_of_stay: float = 0.0
    readmission_rate: float = Field(default=0.0, ge=0.0, le=1.0)


class TrendPoint(BaseModel):
    """One month of a categorical trend: total count plus a per-label breakdown.

    For metric=outcome the labels are treatment outcomes; for metric=risk they
    are risk categories.
    """

    period: str
    total: int = 0
    breakdown: dict[str, int] = Field(default_factory=dict)


class CohortStatistics(BaseModel):
    """Aggregate shape of a filtered research cohort - counts only, computed on
    the same generalised values the anonymised export exposes."""

    cohort_size: int
    age_band_distribution: dict[str, int] = Field(default_factory=dict)
    gender_distribution: dict[str, int] = Field(default_factory=dict)
    diagnosis_distribution: dict[str, int] = Field(default_factory=dict)
