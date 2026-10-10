"""Analytics Service: PostgreSQL-backed patient and hospital analytics."""

from datetime import date

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.treatment import TreatmentOutcome
from app.schemas.analytics import (
    DepartmentPerformance,
    HospitalPerformanceResponse,
    OutcomeMetrics,
    TreatmentEffectivenessMetric,
)


class AnalyticsService:
    """Provides PostgreSQL-backed healthcare analytics."""

    @staticmethod
    def calculate_outcome_metrics(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
        department: str | None = None,
    ) -> OutcomeMetrics:
        """Calculate patient outcome metrics from PostgreSQL."""

        query = select(Admission)

        if start_date is not None:
            query = query.where(Admission.admission_date >= start_date)

        if end_date is not None:
            query = query.where(Admission.admission_date <= end_date)

        admissions = db.execute(query).scalars().all()

        if not admissions:
            return OutcomeMetrics(
                total_patients=0,
                readmission_rate_pct=0.0,
                average_recovery_days=0.0,
                complication_rate_pct=0.0,
                mortality_rate_pct=0.0,
            )

        patient_ids = {a.patient_id for a in admissions}

        readmitted_count = sum(1 for a in admissions if a.readmitted in {"<30", "<30 days"})

        readmission_rate = readmitted_count / len(admissions) * 100 if admissions else 0.0

        recovery_values = [a.time_in_hospital for a in admissions if a.time_in_hospital is not None]

        average_recovery = sum(recovery_values) / len(recovery_values) if recovery_values else 0.0

        admission_ids = [a.id for a in admissions]

        complication_count = 0
        mortality_count = 0

        if admission_ids:
            clinical_rows = db.execute(
                text(
                    """
                    SELECT
                        COUNT(*) FILTER (
                            WHERE complication_occurred = TRUE
                        ) AS complications,
                        COUNT(*) FILTER (
                            WHERE mortality_occurred = TRUE
                        ) AS deaths
                    FROM clinical_outcomes
                    WHERE admission_id = ANY(:admission_ids)
                    """
                ),
                {"admission_ids": admission_ids},
            ).one()

            complication_count = int(clinical_rows.complications or 0)
            mortality_count = int(clinical_rows.deaths or 0)

        total = len(admissions)

        return OutcomeMetrics(
            total_patients=len(patient_ids),
            readmission_rate_pct=round(readmission_rate, 2),
            average_recovery_days=round(average_recovery, 2),
            complication_rate_pct=round(
                complication_count / total * 100,
                2,
            ),
            mortality_rate_pct=round(
                mortality_count / total * 100,
                2,
            ),
        )

    @staticmethod
    def get_hospital_performance(
        db: Session,
        facility_id: str = "default",
    ) -> HospitalPerformanceResponse:
        """Return hospital and department performance from PostgreSQL."""

        rows = (
            db.execute(
                text(
                    """
                SELECT
                    facility_name,
                    reporting_period,
                    department,
                    admissions_count,
                    bed_capacity,
                    occupied_beds,
                    readmission_rate_pct,
                    average_los_days,
                    performance_score
                FROM hospital_performance_metrics
                WHERE facility_id = :facility_id
                ORDER BY department
                """
                ),
                {"facility_id": facility_id},
            )
            .mappings()
            .all()
        )

        if not rows:
            return HospitalPerformanceResponse(
                facility_name="HealthForecast Central Hospital",
                reporting_period="No data",
                overall_readmission_rate=0.0,
                average_los_days=0.0,
                bed_occupancy_rate_pct=0.0,
                departments=[],
            )

        total_admissions = sum(int(row["admissions_count"]) for row in rows)

        weighted_readmission = (
            sum(float(row["readmission_rate_pct"]) * int(row["admissions_count"]) for row in rows)
            / total_admissions
            if total_admissions
            else 0.0
        )

        weighted_los = (
            sum(float(row["average_los_days"]) * int(row["admissions_count"]) for row in rows)
            / total_admissions
            if total_admissions
            else 0.0
        )

        total_beds = sum(int(row["bed_capacity"]) for row in rows)
        occupied_beds = sum(int(row["occupied_beds"]) for row in rows)

        occupancy_rate = occupied_beds / total_beds * 100 if total_beds else 0.0

        departments = [
            DepartmentPerformance(
                department=row["department"],
                admissions_count=int(row["admissions_count"]),
                readmission_rate_pct=float(row["readmission_rate_pct"]),
                avg_length_of_stay=float(row["average_los_days"]),
                performance_score=float(row["performance_score"]),
            )
            for row in rows
        ]

        return HospitalPerformanceResponse(
            facility_name=rows[0]["facility_name"],
            reporting_period=rows[0]["reporting_period"],
            overall_readmission_rate=round(
                weighted_readmission,
                2,
            ),
            average_los_days=round(
                weighted_los,
                2,
            ),
            bed_occupancy_rate_pct=round(
                occupancy_rate,
                2,
            ),
            departments=departments,
        )

    @staticmethod
    def get_trend_snapshots(
        db: Session,
        facility_id: str = "default",
    ) -> list[dict]:
        """Return historical hospital trend snapshots."""

        rows = (
            db.execute(
                text(
                    """
                SELECT
                    snapshot_time,
                    readmission_rate_pct,
                    average_recovery_days,
                    bed_occupancy_rate_pct
                FROM hospital_trend_snapshots
                WHERE facility_id = :facility_id
                ORDER BY snapshot_time ASC
                """
                ),
                {"facility_id": facility_id},
            )
            .mappings()
            .all()
        )

        return [
            {
                "snapshot_time": row["snapshot_time"].isoformat(),
                "readmission_rate_pct": float(row["readmission_rate_pct"]),
                "average_recovery_days": float(row["average_recovery_days"]),
                "bed_occupancy_rate_pct": float(row["bed_occupancy_rate_pct"]),
            }
            for row in rows
        ]

    @staticmethod
    def get_treatment_metrics(
        db: Session,
        condition: str | None = None,
    ) -> list[TreatmentEffectivenessMetric]:
        """Calculate treatment effectiveness from PostgreSQL."""

        query = (
            select(
                TreatmentOutcome.treatment_name,
                func.count(TreatmentOutcome.id).label("patient_count"),
                func.avg(TreatmentOutcome.recovery_score).label("avg_recovery_score"),
                func.avg(TreatmentOutcome.length_of_stay_days).label("avg_recovery_days"),
            )
            .group_by(TreatmentOutcome.treatment_name)
            .order_by(TreatmentOutcome.treatment_name)
        )

        rows = db.execute(query).all()

        results = []

        for row in rows:
            treatment_name = row.treatment_name

            treatment_admissions = (
                db.execute(
                    select(Admission)
                    .join(
                        TreatmentOutcome,
                        TreatmentOutcome.admission_id == Admission.id,
                    )
                    .where(TreatmentOutcome.treatment_name == treatment_name)
                )
                .scalars()
                .all()
            )

            total = len(treatment_admissions)

            if total == 0:
                continue

            successful = sum(
                1 for admission in treatment_admissions if admission.readmitted == "NO"
            )

            readmitted = sum(
                1
                for admission in treatment_admissions
                if admission.readmitted in {"<30", "<30 days"}
            )

            success_rate = successful / total * 100
            readmission_rate = readmitted / total * 100

            results.append(
                TreatmentEffectivenessMetric(
                    treatment_name=treatment_name,
                    condition=condition or "Diabetes",
                    patient_count=int(row.patient_count),
                    success_rate_pct=round(success_rate, 2),
                    readmission_rate_pct=round(
                        readmission_rate,
                        2,
                    ),
                    avg_recovery_days=round(
                        float(row.avg_recovery_days or 0),
                        2,
                    ),
                )
            )

        return results
