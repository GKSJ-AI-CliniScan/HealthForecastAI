"""Analytics API endpoints returning real aggregated clinical intelligence and hospital performance."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import (
    DepartmentAnalyticsResponse,
    HealthcareTrendsResponse,
    HospitalPerformanceResponse,
    MedicationAnalyticsResponse,
    PatientOutcomeAnalyticsResponse,
    TreatmentAnalyticsResponse,
)
from app.schemas.prediction import (
    HighRiskPatientListResponse,
    PredictionSummaryResponse,
    ReadmissionTrendsResponse,
    RiskDistributionResponse,
)
from app.services.hospital_analytics_service import HospitalAnalyticsService
from app.services.medication_service import MedicationService
from app.services.prediction_service import PredictionService
from app.services.treatment_effectiveness_service import TreatmentEffectivenessService

router = APIRouter(prefix="/analytics", tags=["Clinical Analytics"])


# =====================================================================
# Milestone 2 Prediction Analytics (Preserved)
# =====================================================================


@router.get(
    "/risk-distribution",
    response_model=RiskDistributionResponse,
    summary="Risk Category Distribution",
    description="Calculate aggregated counts and percentages across LOW, MEDIUM, HIGH, CRITICAL bands.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_risk_distribution(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RiskDistributionResponse:
    service = PredictionService(db)
    return service.get_risk_distribution()


@router.get(
    "/readmission-trends",
    response_model=ReadmissionTrendsResponse,
    summary="Readmission Risk Trends",
    description="Retrieve daily readmission risk trends over time from stored predictions.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_readmission_trends(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ReadmissionTrendsResponse:
    service = PredictionService(db)
    return service.get_readmission_trends()


@router.get(
    "/high-risk-patients",
    response_model=HighRiskPatientListResponse,
    summary="High-Risk Patients Analytics",
    description="Retrieve current high-risk cases for hospital monitoring.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "SYSTEM_ADMIN"))],
)
def get_high_risk_patients_analytics(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> HighRiskPatientListResponse:
    service = PredictionService(db)
    return service.list_high_risk_patients(current_user=current_user, page=1, page_size=100)


@router.get(
    "/prediction-summary",
    response_model=PredictionSummaryResponse,
    summary="Prediction Intelligence Summary",
    description="Retrieve KPI metrics for clinical prediction dashboards.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_prediction_summary(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> PredictionSummaryResponse:
    service = PredictionService(db)
    return service.get_prediction_summary()


# =====================================================================
# Milestone 3 Treatment Effectiveness Analytics
# =====================================================================


@router.get(
    "/treatments",
    response_model=TreatmentAnalyticsResponse,
    summary="Treatment Effectiveness Analytics",
    description="Retrieve treatment outcome distribution, completion rates, and average effectiveness.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_treatment_analytics(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    start_date: date | None = Query(None, description="Start date filter"),
    end_date: date | None = Query(None, description="End date filter"),
    department: str | None = Query(None, description="Department name filter"),
    treatment_type: str | None = Query(None, description="Treatment modality filter"),
    outcome: str | None = Query(None, description="Outcome category filter"),
) -> TreatmentAnalyticsResponse:
    service = TreatmentEffectivenessService(db)
    return service.get_treatment_analytics(
        start_date=start_date,
        end_date=end_date,
        department=department,
        treatment_type=treatment_type,
        outcome=outcome,
        current_user=current_user,
    )


# =====================================================================
# Milestone 3 Medication Analytics
# =====================================================================


@router.get(
    "/medications",
    response_model=MedicationAnalyticsResponse,
    summary="Medication Outcome Analytics",
    description="Retrieve hospital-wide medication outcome breakdown, active/completed ratios, and effectiveness.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_medication_analytics(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MedicationAnalyticsResponse:
    service = MedicationService(db)
    return service.get_medication_analytics()


# =====================================================================
# Milestone 3 Hospital Performance & Department Analytics
# =====================================================================


@router.get(
    "/hospital-performance",
    response_model=HospitalPerformanceResponse,
    summary="Hospital Performance Overview",
    description="Retrieve hospital-wide KPIs including admissions, treatments, readmissions, and stay durations.",
    dependencies=[Depends(require_roles("HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_hospital_performance(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> HospitalPerformanceResponse:
    service = HospitalAnalyticsService(db)
    return service.get_hospital_performance(current_user=current_user)


@router.get(
    "/departments",
    response_model=DepartmentAnalyticsResponse,
    summary="Department Performance Breakdown",
    description="Retrieve aggregated metrics grouped by hospital department.",
    dependencies=[Depends(require_roles("HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_department_analytics(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DepartmentAnalyticsResponse:
    service = HospitalAnalyticsService(db)
    return service.get_department_analytics()


# =====================================================================
# Milestone 3 Patient Outcomes Analytics
# =====================================================================


@router.get(
    "/patient-outcomes",
    response_model=PatientOutcomeAnalyticsResponse,
    summary="Patient Outcome Analytics",
    description="Retrieve hospital-wide recovery distributions, improvement rates, and temporal outcome trends.",
    dependencies=[Depends(require_roles("DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_patient_outcomes_analytics(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    department: str | None = Query(None),
    outcome: str | None = Query(None),
) -> PatientOutcomeAnalyticsResponse:
    service = HospitalAnalyticsService(db)
    return service.get_patient_outcome_analytics(
        start_date=start_date,
        end_date=end_date,
        department=department,
        outcome=outcome,
    )


# =====================================================================
# Milestone 3 Healthcare Trend Monitoring
# =====================================================================


@router.get(
    "/trends",
    response_model=HealthcareTrendsResponse,
    summary="Healthcare Trend Monitoring",
    description="Retrieve multi-frequency operational trends (daily, weekly, monthly).",
    dependencies=[Depends(require_roles("HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def get_healthcare_trends(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    frequency: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
) -> HealthcareTrendsResponse:
    service = HospitalAnalyticsService(db)
    return service.get_healthcare_trends(
        frequency=frequency,
        start_date=start_date,
        end_date=end_date,
    )


# =====================================================================
# Milestone 3 CSV Data Exports
# =====================================================================


@router.get(
    "/export/treatments",
    summary="Export Treatments CSV",
    description="Export treatments dataset. Automatically de-identified if requested by RESEARCHER role.",
    dependencies=[Depends(require_roles("HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def export_treatments_csv(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    service = HospitalAnalyticsService(db)
    csv_data = service.export_treatments_csv(current_user=current_user)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=treatments_analytics.csv"},
    )


@router.get(
    "/export/outcomes",
    summary="Export Recovery Outcomes CSV",
    description="Export patient recovery outcomes dataset. De-identified if requested by RESEARCHER role.",
    dependencies=[Depends(require_roles("HOSPITAL_ADMIN", "RESEARCHER", "SYSTEM_ADMIN"))],
)
def export_outcomes_csv(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    service = HospitalAnalyticsService(db)
    csv_data = service.export_outcomes_csv(current_user=current_user)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=outcomes_analytics.csv"},
    )
