"""Analytics & Reporting API Endpoints."""

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import (
    DepartmentPerformance,
    HospitalPerformanceResponse,
    OutcomeMetrics,
    ReportGenerationRequest,
    ReportGenerationResponse,
    TreatmentEffectivenessMetric,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get(
    "/summary",
    summary="Get analytics executive summary",
    response_model=dict[str, Any],
)
def get_analytics_summary(
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Protected executive summary for RBAC compliance."""
    perf = AnalyticsService.get_hospital_performance()
    outcomes = AnalyticsService.calculate_outcome_metrics()
    return {
        "status": "active",
        "facility": perf.facility_name,
        "readmission_rate_pct": outcomes.readmission_rate_pct,
        "total_patients": outcomes.total_patients,
        "departments_count": len(perf.departments),
    }


@router.get(
    "/outcomes",
    response_model=OutcomeMetrics,
    summary="Get aggregated patient outcome statistics",
)
def get_patient_outcomes(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    department: str | None = Query(None),
) -> OutcomeMetrics:
    return AnalyticsService.calculate_outcome_metrics(start_date, end_date, department)


@router.get(
    "/hospital-performance",
    response_model=HospitalPerformanceResponse,
    summary="Get hospital and facility KPIs",
)
def get_hospital_performance(
    facility_id: str = Query("default"),
) -> HospitalPerformanceResponse:
    return AnalyticsService.get_hospital_performance(facility_id)


@router.get(
    "/departments",
    response_model=list[DepartmentPerformance],
    summary="Get department-level performance metrics",
)
def get_department_performance() -> list[DepartmentPerformance]:
    performance = AnalyticsService.get_hospital_performance()
    return performance.departments


@router.get(
    "/treatments/effectiveness",
    response_model=list[TreatmentEffectivenessMetric],
    summary="Get treatment effectiveness and outcome metrics",
)
def get_treatment_effectiveness(
    condition: str | None = Query(None),
) -> list[TreatmentEffectivenessMetric]:
    return AnalyticsService.get_treatment_metrics(condition)


@router.post(
    "/reports/generate",
    response_model=ReportGenerationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate patient outcome and hospital analytics report",
)
def generate_report(payload: ReportGenerationRequest) -> ReportGenerationResponse:
    outcomes = AnalyticsService.calculate_outcome_metrics(payload.start_date, payload.end_date)
    perf = AnalyticsService.get_hospital_performance()
    treatments = AnalyticsService.get_treatment_metrics()

    return ReportGenerationResponse(
        report_id="REP-2026-X89",
        generated_at=str(date.today()),
        summary_metrics=outcomes,
        department_breakdown=perf.departments,
        top_treatments=treatments,
        download_url=f"/api/v1/analytics/reports/download/REP-2026-X89.{payload.export_format}",
    )
