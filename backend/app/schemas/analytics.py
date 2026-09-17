"""Clinical & Hospital Analytics schemas."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from pydantic import BaseModel, Field

# --- Filter schemas ---


class AnalyticsFilterParams(BaseModel):
    """Common filter parameters for analytics endpoints."""

    start_date: date | None = None
    end_date: date | None = None
    department: str | None = None
    treatment_type: str | None = None
    outcome: str | None = None


# --- Treatment Analytics ---


class TreatmentTypeDistribution(BaseModel):
    """Treatment count by type."""

    treatment_type: str
    count: int
    avg_effectiveness: float | None = None


class TreatmentAnalyticsResponse(BaseModel):
    """Response schema for GET /api/v1/analytics/treatments."""

    total_treatments: int
    completed_treatments: int
    average_effectiveness: float | None = None
    effectiveness_rate: float | None = Field(
        None,
        description="Percentage of evaluated treatments that resulted in IMPROVED or STABLE",
    )
    outcome_distribution: dict[str, int]
    type_distribution: list[TreatmentTypeDistribution] = Field(default_factory=list)
    status_distribution: dict[str, int] = Field(default_factory=dict)


# --- Recovery & Outcome progression ---


class RecoveryTimelineEvent(BaseModel):
    """Individual event in patient recovery flow."""

    event_type: str  # ADMISSION, TREATMENT, TREATMENT_OUTCOME, OUTCOME, DISCHARGE
    event_date: date
    title: str
    status: str | None = None
    score: float | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class PatientRecoveryResponse(BaseModel):
    """Response schema for GET /api/v1/patients/{patient_id}/recovery."""

    patient_id: uuid.UUID
    timeline: list[RecoveryTimelineEvent]
    average_length_of_stay: float | None = None
    total_admissions: int
    total_treatments: int
    recovery_status: str | None = None
    latest_outcome_score: float | None = None
    outcome_progression: list[dict[str, Any]] = Field(default_factory=list)


# --- Medication Analytics ---


class MedicationOutcomeDistribution(BaseModel):
    """Medication outcome counts."""

    outcome: str
    count: int


class MedicationSummaryItem(BaseModel):
    """Aggregated medication table item."""

    medication_name: str
    total_patients: int
    active_count: int
    completed_count: int
    avg_effectiveness: float | None = None
    outcome_distribution: dict[str, int] = Field(default_factory=dict)


class MedicationAnalyticsResponse(BaseModel):
    """Response schema for GET /api/v1/analytics/medications."""

    total_medications: int
    active_medications: int
    completed_medications: int
    average_effectiveness: float | None = None
    outcome_distribution: dict[str, int]
    medication_breakdown: list[MedicationSummaryItem] = Field(default_factory=list)


# --- Hospital Performance ---


class ReadmissionStat(BaseModel):
    """Readmission statistics from predictions."""

    total_assessed: int
    readmission_rate_pct: float
    high_risk_count: int
    critical_risk_count: int


class HospitalPerformanceResponse(BaseModel):
    """Response schema for GET /api/v1/analytics/hospital-performance."""

    total_patients: int
    total_admissions: int
    total_treatments: int
    treatment_completion_rate: float
    average_length_of_stay: float
    average_treatment_effectiveness: float | None = None
    patient_outcome_distribution: dict[str, int]
    readmission_statistics: ReadmissionStat
    department_count: int


# --- Department Performance ---


class DepartmentAnalyticsItem(BaseModel):
    """Aggregated performance metrics for a clinical department."""

    department: str
    patients: int
    admissions: int
    average_length_of_stay: float
    treatments: int
    treatment_effectiveness: float | None = None
    outcome_distribution: dict[str, int] = Field(default_factory=dict)


class DepartmentAnalyticsResponse(BaseModel):
    """Response schema for GET /api/v1/analytics/departments."""

    departments: list[DepartmentAnalyticsItem]


# --- Patient Outcomes Analytics ---


class OutcomeTrendPoint(BaseModel):
    """Outcome count point in time."""

    date: str
    improved: int = 0
    stable: int = 0
    worsened: int = 0
    other: int = 0


class PatientOutcomeAnalyticsResponse(BaseModel):
    """Response schema for GET /api/v1/analytics/patient-outcomes."""

    total_outcomes_recorded: int
    outcome_distribution: dict[str, int]
    improvement_rate_pct: float | None = None
    outcome_trends: list[OutcomeTrendPoint] = Field(default_factory=list)
    recovery_status_distribution: dict[str, int] = Field(default_factory=dict)


# --- Healthcare Trends ---


class HealthcareTrendPoint(BaseModel):
    """Multi-metric healthcare trend data point."""

    period: str  # YYYY-MM-DD or YYYY-WW or YYYY-MM
    admissions: int = 0
    discharges: int = 0
    treatments: int = 0
    readmissions: int = 0
    high_risk_patients: int = 0
    improved_outcomes: int = 0


class HealthcareTrendsResponse(BaseModel):
    """Response schema for GET /api/v1/analytics/trends."""

    frequency: str  # daily, weekly, monthly
    start_date: str | None = None
    end_date: str | None = None
    trends: list[HealthcareTrendPoint]
