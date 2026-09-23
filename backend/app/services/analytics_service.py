"""Healthcare analytics service - business logic layer (Module 6)."""

from datetime import UTC, datetime
from typing import Any

from app.schemas.analytics import HospitalAnalyticsSummary, RiskDistribution


def get_hospital_analytics_summary() -> HospitalAnalyticsSummary:
    """Return top-level executive KPIs for the hospital administration."""
    return HospitalAnalyticsSummary(
        total_patients=10240,
        total_admissions=14850,
        readmission_rate=0.112,  # 11.2% baseline 30-day readmission rate
        average_length_of_stay=4.38,  # days
        risk_distribution=RiskDistribution(
            low=5820,
            medium=3140,
            high=1280,
        ),
    )


def get_readmission_trends() -> list[dict[str, Any]]:
    """Return monthly readmission trajectory and breakdown by discharge disposition."""
    return [
        {
            "month": "Jan 2026",
            "total_admissions": 1210,
            "readmissions_30d": 158,
            "readmission_rate": 0.131,
            "top_disposition": "Discharged to home",
        },
        {
            "month": "Feb 2026",
            "total_admissions": 1180,
            "readmissions_30d": 146,
            "readmission_rate": 0.124,
            "top_disposition": "Discharged to home",
        },
        {
            "month": "Mar 2026",
            "total_admissions": 1260,
            "readmissions_30d": 147,
            "readmission_rate": 0.117,
            "top_disposition": "Discharged to home",
        },
        {
            "month": "Apr 2026",
            "total_admissions": 1240,
            "readmissions_30d": 139,
            "readmission_rate": 0.112,
            "top_disposition": "Discharged to home",
        },
        {
            "month": "May 2026",
            "total_admissions": 1310,
            "readmissions_30d": 140,
            "readmission_rate": 0.107,
            "top_disposition": "Discharged to home",
        },
        {
            "month": "Jun 2026",
            "total_admissions": 1290,
            "readmissions_30d": 134,
            "readmission_rate": 0.104,
            "top_disposition": "Discharged to home",
        },
    ]


def get_population_health_data() -> dict[str, Any]:
    """Return aggregated population health analytics for researchers.

    Adheres strictly to HIPAA/RBAC: aggregated summary values only, never row-level records.
    """
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "total_cohort_size": 10240,
        "primary_diagnosis_breakdown": [
            {
                "category": "Circulatory / Cardiovascular",
                "patient_count": 3120,
                "prevalence_pct": 30.5,
                "readmission_rate": 0.138,
                "average_recovery_score": 79.4,
            },
            {
                "category": "Diabetes Mellitus Complications",
                "patient_count": 2840,
                "prevalence_pct": 27.7,
                "readmission_rate": 0.122,
                "average_recovery_score": 81.2,
            },
            {
                "category": "Respiratory Conditions",
                "patient_count": 1650,
                "prevalence_pct": 16.1,
                "readmission_rate": 0.115,
                "average_recovery_score": 76.8,
            },
            {
                "category": "Digestive & Gastrointestinal",
                "patient_count": 1180,
                "prevalence_pct": 11.5,
                "readmission_rate": 0.086,
                "average_recovery_score": 85.1,
            },
            {
                "category": "Other Clinical Conditions",
                "patient_count": 1450,
                "prevalence_pct": 14.2,
                "readmission_rate": 0.074,
                "average_recovery_score": 87.0,
            },
        ],
        "age_distribution": [
            {"age_bracket": "[40-50)", "count": 1280, "readmission_rate": 0.075},
            {"age_bracket": "[50-60)", "count": 2420, "readmission_rate": 0.094},
            {"age_bracket": "[60-70)", "count": 3350, "readmission_rate": 0.118},
            {"age_bracket": "[70-80)", "count": 2110, "readmission_rate": 0.141},
            {"age_bracket": "[80-90)", "count": 1080, "readmission_rate": 0.165},
        ],
    }


def get_performance_kpis() -> dict[str, Any]:
    """Return hospital operational performance metrics."""
    return {
        "bed_occupancy_rate": 0.842,  # 84.2% occupancy
        "average_discharge_velocity_hours": 3.6,
        "readmission_reduction_progress_pct": 20.6,
        "icu_average_stay_days": 2.8,
        "emergency_to_inpatient_conversion_pct": 14.3,
    }
