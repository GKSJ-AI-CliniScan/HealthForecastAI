"""Pydantic schemas for Patient Outcome & Hospital Analytics."""

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class OutcomeMetrics(BaseModel):
    total_patients: int
    readmission_rate_pct: float
    average_recovery_days: float
    complication_rate_pct: float
    mortality_rate_pct: float


class DepartmentPerformance(BaseModel):
    department: str
    admissions_count: int
    readmission_rate_pct: float
    avg_length_of_stay: float
    performance_score: float = Field(..., ge=0, le=100)


class HospitalPerformanceResponse(BaseModel):
    facility_name: str
    reporting_period: str
    overall_readmission_rate: float
    average_los_days: float
    bed_occupancy_rate_pct: float
    departments: List[DepartmentPerformance]


class TreatmentEffectivenessMetric(BaseModel):
    treatment_name: str
    condition: str
    patient_count: int
    success_rate_pct: float
    readmission_rate_pct: float
    avg_recovery_days: float


class ReportGenerationRequest(BaseModel):
    title: str = "Hospital Performance & Patient Outcome Report"
    start_date: date
    end_date: date
    departments: Optional[List[str]] = None
    include_treatments: bool = True
    export_format: str = Field("json", description="json or pdf")


class ReportGenerationResponse(BaseModel):
    report_id: str
    generated_at: str
    summary_metrics: OutcomeMetrics
    department_breakdown: List[DepartmentPerformance]
    top_treatments: List[TreatmentEffectivenessMetric]
    download_url: Optional[str] = None