"""Hospital Performance, Department, Trend Analytics and Data Export Service."""

from __future__ import annotations

import csv
import io
import uuid
from collections import defaultdict
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.models.patient_outcome import PatientOutcome
from app.models.prediction import Prediction
from app.models.treatment import Treatment
from app.models.user import User
from app.schemas.analytics import (
    DepartmentAnalyticsItem,
    DepartmentAnalyticsResponse,
    HealthcareTrendPoint,
    HealthcareTrendsResponse,
    HospitalPerformanceResponse,
    OutcomeTrendPoint,
    PatientOutcomeAnalyticsResponse,
    ReadmissionStat,
)
from app.services.audit_service import AuditService
from app.utils.anonymizer import generate_anonymized_id


class HospitalAnalyticsService:
    """Service providing hospital-wide KPIs, department intelligence, trends, and secure data exports."""

    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)

    def get_hospital_performance(
        self, current_user: User | None = None
    ) -> HospitalPerformanceResponse:
        """Calculate hospital-wide operational and clinical metrics directly from DB."""
        total_patients = self.db.scalar(select(func.count(Patient.id))) or 0
        total_admissions = self.db.scalar(select(func.count(Admission.id))) or 0
        total_treatments = self.db.scalar(select(func.count(Treatment.id))) or 0

        # Completed treatments
        completed_tx = (
            self.db.scalar(select(func.count(Treatment.id)).where(Treatment.status == "COMPLETED"))
            or 0
        )
        tx_completion_rate = (
            round((completed_tx / total_treatments) * 100, 2) if total_treatments > 0 else 0.0
        )

        # Average length of stay
        avg_los_raw = self.db.scalar(
            select(func.avg(Admission.length_of_stay)).where(Admission.length_of_stay.isnot(None))
        )
        avg_los = round(float(avg_los_raw), 2) if avg_los_raw is not None else 0.0

        # Average treatment effectiveness
        avg_eff_raw = self.db.scalar(
            select(func.avg(Treatment.effectiveness_score)).where(
                Treatment.effectiveness_score.isnot(None)
            )
        )
        avg_effectiveness = round(float(avg_eff_raw), 2) if avg_eff_raw is not None else None

        # Patient outcome distribution
        outcomes = list(self.db.scalars(select(PatientOutcome.outcome_status)).all())
        outcome_dist: dict[str, int] = defaultdict(int)
        for st in outcomes:
            outcome_dist[st] += 1

        # Readmission stats from predictions (Milestone 2 integration)
        predictions = list(self.db.scalars(select(Prediction)).all())
        total_assessed = len(predictions)
        high_risk = sum(1 for p in predictions if p.risk_category in ("HIGH", "CRITICAL"))
        critical_risk = sum(1 for p in predictions if p.risk_category == "CRITICAL")
        readmitted_cases = sum(1 for p in predictions if p.readmission_probability >= 0.5)
        readmission_rate = (
            round((readmitted_cases / total_assessed) * 100, 2) if total_assessed > 0 else 0.0
        )

        dept_count = len(
            set(
                self.db.scalars(
                    select(Admission.department).where(Admission.department.isnot(None)).distinct()
                ).all()
            )
        )

        if current_user:
            self.audit_service.log_action(
                action="HOSPITAL_REPORT_VIEW",
                resource="HOSPITAL_PERFORMANCE_ANALYTICS",
                resource_id="HOSPITAL_WIDE",
                user_id=current_user.id,
            )

        return HospitalPerformanceResponse(
            total_patients=total_patients,
            total_admissions=total_admissions,
            total_treatments=total_treatments,
            treatment_completion_rate=tx_completion_rate,
            average_length_of_stay=avg_los,
            average_treatment_effectiveness=avg_effectiveness,
            patient_outcome_distribution=dict(outcome_dist),
            readmission_statistics=ReadmissionStat(
                total_assessed=total_assessed,
                readmission_rate_pct=readmission_rate,
                high_risk_count=high_risk,
                critical_risk_count=critical_risk,
            ),
            department_count=dept_count,
        )

    def get_department_analytics(self) -> DepartmentAnalyticsResponse:
        """Calculate aggregated clinical metrics grouped by hospital department."""
        admissions = list(self.db.scalars(select(Admission)).all())
        treatments = list(self.db.scalars(select(Treatment)).all())
        outcomes = list(self.db.scalars(select(PatientOutcome)).all())

        # Map patient_id -> department(s)
        patient_depts: dict[uuid.UUID, set[str]] = defaultdict(set)
        for a in admissions:
            dept = a.department or "General"
            patient_depts[a.patient_id].add(dept)

        # Department -> stats
        dept_data: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "patients": set(),
                "admissions": 0,
                "los_list": [],
                "treatments": 0,
                "effectiveness_scores": [],
                "outcomes": defaultdict(int),
            }
        )

        for a in admissions:
            dept = a.department or "General"
            dept_data[dept]["patients"].add(a.patient_id)
            dept_data[dept]["admissions"] += 1
            if a.length_of_stay is not None:
                dept_data[dept]["los_list"].append(a.length_of_stay)

        for t in treatments:
            depts = patient_depts.get(t.patient_id, {"General"})
            for d in depts:
                dept_data[d]["treatments"] += 1
                if t.effectiveness_score is not None:
                    dept_data[d]["effectiveness_scores"].append(t.effectiveness_score)

        for o in outcomes:
            depts = patient_depts.get(o.patient_id, {"General"})
            for d in depts:
                dept_data[d]["outcomes"][o.outcome_status] += 1

        items: list[DepartmentAnalyticsItem] = []
        for dept_name, d in sorted(dept_data.items()):
            los_avg = round(sum(d["los_list"]) / len(d["los_list"]), 2) if d["los_list"] else 0.0
            eff_avg = (
                round(sum(d["effectiveness_scores"]) / len(d["effectiveness_scores"]), 2)
                if d["effectiveness_scores"]
                else None
            )
            items.append(
                DepartmentAnalyticsItem(
                    department=dept_name,
                    patients=len(d["patients"]),
                    admissions=d["admissions"],
                    average_length_of_stay=los_avg,
                    treatments=d["treatments"],
                    treatment_effectiveness=eff_avg,
                    outcome_distribution=dict(d["outcomes"]),
                )
            )

        return DepartmentAnalyticsResponse(departments=items)

    def get_patient_outcome_analytics(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        department: str | None = None,
        outcome: str | None = None,
    ) -> PatientOutcomeAnalyticsResponse:
        """Calculate hospital-wide recovery distributions, trends, and improvement rates."""
        query = select(PatientOutcome)

        if start_date:
            query = query.where(PatientOutcome.recorded_date >= start_date)
        if end_date:
            query = query.where(PatientOutcome.recorded_date <= end_date)
        if outcome:
            query = query.where(PatientOutcome.outcome_status == outcome)

        if department:
            query = (
                query.join(Patient, PatientOutcome.patient_id == Patient.id)
                .join(Admission, Admission.patient_id == Patient.id)
                .where(Admission.department.ilike(f"%{department}%"))
                .distinct()
            )

        records = list(self.db.scalars(query).all())
        total = len(records)

        outcome_dist: dict[str, int] = defaultdict(int)
        for r in records:
            outcome_dist[r.outcome_status] += 1

        # Calculate improvement rate (IMPROVED or DISCHARGED_RECOVERED or STABLE)
        positive_count = sum(
            count
            for status_name, count in outcome_dist.items()
            if any(term in status_name.upper() for term in ("RECOVERED", "IMPROV", "STABLE"))
        )
        improvement_rate = round((positive_count / total) * 100, 2) if total > 0 else None

        # Temporal trends
        trend_groups: dict[str, dict[str, int]] = defaultdict(
            lambda: {"improved": 0, "stable": 0, "worsened": 0, "other": 0}
        )
        for r in records:
            d_str = r.recorded_date.strftime("%Y-%m-%d")
            st = r.outcome_status.upper()
            if "IMPROV" in st or "RECOVERED" in st:
                trend_groups[d_str]["improved"] += 1
            elif "STABLE" in st:
                trend_groups[d_str]["stable"] += 1
            elif "WORSEN" in st or "COMPLICATION" in st or "READMIT" in st:
                trend_groups[d_str]["worsened"] += 1
            else:
                trend_groups[d_str]["other"] += 1

        trends: list[OutcomeTrendPoint] = [
            OutcomeTrendPoint(
                date=d_key,
                improved=counts["improved"],
                stable=counts["stable"],
                worsened=counts["worsened"],
                other=counts["other"],
            )
            for d_key, counts in sorted(trend_groups.items())
        ]

        return PatientOutcomeAnalyticsResponse(
            total_outcomes_recorded=total,
            outcome_distribution=dict(outcome_dist),
            improvement_rate_pct=improvement_rate,
            outcome_trends=trends,
            recovery_status_distribution=dict(outcome_dist),
        )

    def get_healthcare_trends(
        self,
        frequency: str = "daily",
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> HealthcareTrendsResponse:
        """Calculate multi-frequency operational trends for admissions, treatments, readmissions, and outcomes."""
        admissions = list(self.db.scalars(select(Admission)).all())
        treatments = list(self.db.scalars(select(Treatment)).all())
        predictions = list(self.db.scalars(select(Prediction)).all())
        outcomes = list(self.db.scalars(select(PatientOutcome)).all())

        def get_period(d: date) -> str:
            if frequency == "weekly":
                return f"{d.year}-W{d.isocalendar().week:02d}"
            elif frequency == "monthly":
                return f"{d.year}-{d.month:02d}"
            return d.strftime("%Y-%m-%d")

        period_data: dict[str, HealthcareTrendPoint] = defaultdict(
            lambda: HealthcareTrendPoint(period="")
        )

        for a in admissions:
            if start_date and a.admission_date < start_date:
                continue
            if end_date and a.admission_date > end_date:
                continue
            p = get_period(a.admission_date)
            period_data[p].period = p
            period_data[p].admissions += 1

            if a.discharge_date:
                dp = get_period(a.discharge_date)
                period_data[dp].period = dp
                period_data[dp].discharges += 1

        for t in treatments:
            if start_date and t.start_date < start_date:
                continue
            if end_date and t.start_date > end_date:
                continue
            p = get_period(t.start_date)
            period_data[p].period = p
            period_data[p].treatments += 1

        for pred in predictions:
            dt = pred.created_at.date()
            if start_date and dt < start_date:
                continue
            if end_date and dt > end_date:
                continue
            p = get_period(dt)
            period_data[p].period = p
            if pred.risk_category in ("HIGH", "CRITICAL"):
                period_data[p].high_risk_patients += 1
            if pred.readmission_probability >= 0.5:
                period_data[p].readmissions += 1

        for o in outcomes:
            if start_date and o.recorded_date < start_date:
                continue
            if end_date and o.recorded_date > end_date:
                continue
            p = get_period(o.recorded_date)
            period_data[p].period = p
            st = o.outcome_status.upper()
            if "IMPROV" in st or "RECOVERED" in st:
                period_data[p].improved_outcomes += 1

        sorted_trends = [point for _, point in sorted(period_data.items()) if point.period]

        return HealthcareTrendsResponse(
            frequency=frequency,
            start_date=start_date.isoformat() if start_date else None,
            end_date=end_date.isoformat() if end_date else None,
            trends=sorted_trends,
        )

    def export_treatments_csv(self, current_user: User) -> str:
        """Export treatment records as CSV with strict HIPAA de-identification for Researchers."""
        treatments = list(
            self.db.scalars(select(Treatment).order_by(Treatment.start_date.desc())).all()
        )
        is_researcher = current_user.role == "RESEARCHER"

        output = io.StringIO()
        writer = csv.writer(output)

        if is_researcher:
            # Anonymized research dataset - No PII, No UUIDs
            writer.writerow(
                [
                    "Research_Subject_ID",
                    "Treatment_Type",
                    "Treatment_Status",
                    "Outcome",
                    "Effectiveness_Score",
                    "Treatment_Year",
                ]
            )
            for t in treatments:
                anon_id = generate_anonymized_id(t.patient_id)
                writer.writerow(
                    [
                        anon_id,
                        t.treatment_type or "Unspecified",
                        t.status,
                        t.outcome or "UNKNOWN",
                        t.effectiveness_score if t.effectiveness_score is not None else "N/A",
                        t.start_date.year,
                    ]
                )
        else:
            # Full clinical dataset
            writer.writerow(
                [
                    "Treatment_ID",
                    "Patient_ID",
                    "Treatment_Name",
                    "Treatment_Type",
                    "Start_Date",
                    "End_Date",
                    "Status",
                    "Outcome",
                    "Effectiveness_Score",
                    "Notes",
                ]
            )
            for t in treatments:
                writer.writerow(
                    [
                        str(t.id),
                        str(t.patient_id),
                        t.treatment_name,
                        t.treatment_type or "",
                        t.start_date.isoformat(),
                        t.end_date.isoformat() if t.end_date else "",
                        t.status,
                        t.outcome or "",
                        t.effectiveness_score if t.effectiveness_score is not None else "",
                        t.notes or "",
                    ]
                )

        self.audit_service.log_action(
            action="ANALYTICS_EXPORT_TREATMENTS",
            resource="TREATMENTS_DATASET",
            resource_id="ALL",
            user_id=current_user.id,
        )

        return output.getvalue()

    def export_outcomes_csv(self, current_user: User) -> str:
        """Export patient recovery outcomes as CSV with strict HIPAA de-identification for Researchers."""
        outcomes = list(
            self.db.scalars(
                select(PatientOutcome).order_by(PatientOutcome.recorded_date.desc())
            ).all()
        )
        is_researcher = current_user.role == "RESEARCHER"

        output = io.StringIO()
        writer = csv.writer(output)

        if is_researcher:
            # Anonymized research dataset
            writer.writerow(
                [
                    "Research_Subject_ID",
                    "Outcome_Status",
                    "Outcome_Score",
                    "Evaluation_Year",
                ]
            )
            for o in outcomes:
                anon_id = generate_anonymized_id(o.patient_id)
                writer.writerow(
                    [
                        anon_id,
                        o.outcome_status,
                        o.outcome_score if o.outcome_score is not None else "N/A",
                        o.recorded_date.year,
                    ]
                )
        else:
            # Clinical dataset
            writer.writerow(
                [
                    "Outcome_ID",
                    "Patient_ID",
                    "Admission_ID",
                    "Outcome_Status",
                    "Outcome_Score",
                    "Recorded_Date",
                    "Notes",
                ]
            )
            for o in outcomes:
                writer.writerow(
                    [
                        str(o.id),
                        str(o.patient_id),
                        str(o.admission_id) if o.admission_id else "",
                        o.outcome_status,
                        o.outcome_score if o.outcome_score is not None else "",
                        o.recorded_date.isoformat(),
                        o.notes or "",
                    ]
                )

        self.audit_service.log_action(
            action="ANALYTICS_EXPORT_OUTCOMES",
            resource="OUTCOMES_DATASET",
            resource_id="ALL",
            user_id=current_user.id,
        )

        return output.getvalue()
