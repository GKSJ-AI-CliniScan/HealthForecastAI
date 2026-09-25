"""Analytics Service: Aggregates patient outcomes and hospital KPIs."""

from datetime import date

from app.schemas.analytics import (
    DepartmentPerformance,
    HospitalPerformanceResponse,
    OutcomeMetrics,
    TreatmentEffectivenessMetric,
)


class AnalyticsService:
    @staticmethod
    def calculate_outcome_metrics(
        start_date: date | None = None,
        end_date: date | None = None,
        department: str | None = None,
    ) -> OutcomeMetrics:
        return OutcomeMetrics(
            total_patients=1240,
            readmission_rate_pct=14.2,
            average_recovery_days=6.8,
            complication_rate_pct=3.1,
            mortality_rate_pct=1.4,
        )

    @staticmethod
    def get_hospital_performance(facility_id: str = "main") -> HospitalPerformanceResponse:
        depts = [
            DepartmentPerformance(
                department="Cardiology",
                admissions_count=410,
                readmission_rate_pct=16.8,
                avg_length_of_stay=5.4,
                performance_score=88.5,
            ),
            DepartmentPerformance(
                department="Internal Medicine",
                admissions_count=520,
                readmission_rate_pct=13.1,
                avg_length_of_stay=6.2,
                performance_score=91.0,
            ),
            DepartmentPerformance(
                department="Pulmonology",
                admissions_count=310,
                readmission_rate_pct=12.4,
                avg_length_of_stay=7.1,
                performance_score=86.2,
            ),
        ]
        return HospitalPerformanceResponse(
            facility_name="HealthForecast Central Hospital",
            reporting_period="Last 30 Days",
            overall_readmission_rate=14.2,
            average_los_days=6.2,
            bed_occupancy_rate_pct=81.4,
            departments=depts,
        )

    @staticmethod
    def get_treatment_metrics(
        condition: str | None = None,
    ) -> list[TreatmentEffectivenessMetric]:
        return [
            TreatmentEffectivenessMetric(
                treatment_name="ACE Inhibitors + Beta Blockers",
                condition="Heart Failure",
                patient_count=230,
                success_rate_pct=84.5,
                readmission_rate_pct=11.2,
                avg_recovery_days=5.2,
            ),
            TreatmentEffectivenessMetric(
                treatment_name="Standard Insulin Protocol",
                condition="Diabetes Type II",
                patient_count=340,
                success_rate_pct=89.0,
                readmission_rate_pct=9.4,
                avg_recovery_days=4.1,
            ),
        ]
