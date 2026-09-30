"""Patient outcome reports and data exports.

Milestone 3.

Three outputs, each with a different audience and a different privacy posture:

  * A patient outcome report for a clinician: identifiable, but only for patients
    in the caller's scope, and recorded in the audit log.
  * A hospital performance export for an administrator: aggregate only.
  * A research dataset for a researcher: row level but de-identified, with
    k-anonymity enforced before anything leaves the building.

Every export is written to the audit log. "Who downloaded what, and when" is the
first question after any data incident, and it cannot be answered retroactively.
"""

from __future__ import annotations

import csv
import io
from collections import Counter
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.rbac import Permission, has_permission
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome
from app.models.user import User
from app.services import (
    auth_service,
    cds_service,
    patient_service,
    performance_service,
    risk_service,
)

# A release is k-anonymous when every combination of quasi-identifiers appears at
# least k times. Below that, a row can be picked out by who the patient is rather
# than anything in their record.
DEFAULT_K = 10
QUASI_IDENTIFIERS = ("age_group", "gender", "race", "primary_diagnosis", "admission_type")

RESEARCH_COLUMNS = [
    "pseudo_id",
    *QUASI_IDENTIFIERS,
    "discharge_disposition",
    "time_in_hospital",
    "num_medications",
    "number_diagnoses",
    "number_inpatient",
    "a1c_measured",
    "medication_changed",
    "readmitted_within_30_days",
    "predicted_risk",
]

# Cells starting with these are interpreted as formulas by spreadsheet software.
# Patient data should never be able to execute anything when a CSV is opened.
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def safe_cell(value: Any) -> Any:
    """Neutralise CSV formula injection in a string cell."""
    if isinstance(value, str) and value.startswith(FORMULA_PREFIXES):
        return "'" + value
    return value


def to_csv(
    columns: list[str], rows: list[dict[str, Any]], preamble: list[str] | None = None
) -> str:
    """Render rows as CSV, optionally with comment lines above the header."""
    buffer = io.StringIO()
    for line in preamble or []:
        buffer.write(f"# {line}\n")
    writer = csv.DictWriter(buffer, fieldnames=columns, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({column: safe_cell(row.get(column)) for column in columns})
    return buffer.getvalue()


# --------------------------------------------------------------------------
# Patient outcome report
# --------------------------------------------------------------------------


def patient_outcome_report(db: Session, actor: User, patient_id: int) -> dict[str, Any] | None:
    """A clinician-facing outcome report for one patient, or None when out of scope."""
    patient = patient_service.get_patient(db, actor, patient_id)
    if patient is None:
        return None

    admissions = patient_service.list_admissions(db, actor, patient_id) or []
    admission_ids = [a.id for a in admissions]

    treatments: dict[int, list[dict[str, Any]]] = {}
    if admission_ids:
        for row in db.execute(
            select(TreatmentOutcome).where(TreatmentOutcome.admission_id.in_(admission_ids))
        ).scalars():
            treatments.setdefault(row.admission_id, []).append(
                {"treatment_name": row.treatment_name, "dose_change": row.dose_change}
            )

    admission_rows = [
        {
            "id": a.id,
            "admission_type": a.admission_type,
            "department": a.department,
            "length_of_stay_days": a.time_in_hospital,
            "discharge_disposition": a.discharge_disposition,
            "medications_recorded": a.num_medications,
            "diagnoses_recorded": a.number_diagnoses,
            "prior_inpatient_visits": a.number_inpatient,
            "a1c_result": a.a1c_result or "not measured",
            "medication_changed": a.medication_changed,
            "readmitted": a.readmitted,
            "treatments": sorted(treatments.get(a.id, []), key=lambda t: t["treatment_name"]),
        }
        for a in admissions
    ]

    context = cds_service.load_context(db, actor, patient_id)
    readmissions = sum(1 for a in admissions if a.readmitted == "<30")

    report: dict[str, Any] = {
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "generated_for": actor.full_name,
        "patient": {
            "id": patient.id,
            "medical_record_number": patient.medical_record_number,
            "age_group": patient.age_group,
            "gender": patient.gender,
            "race": patient.race,
            "primary_diagnosis": patient.primary_diagnosis,
        },
        "outcome_summary": {
            "admissions": len(admissions),
            "readmissions_within_30_days": readmissions,
            "total_days_in_hospital": sum(a.time_in_hospital or 0 for a in admissions),
            "treatments_given": sorted(
                {t["treatment_name"] for ts in treatments.values() for t in ts}
            ),
        },
        "admissions": admission_rows,
        "risk": None,
        "explanation": None,
        "recommendations": None,
        "disclaimer": cds_service.DISCLAIMER,
    }

    if context is not None and context.probability is not None:
        report["risk"] = {
            "readmission_probability": round(context.probability, 4),
            "risk_category": context.band,
            "baseline_probability": context.baseline,
            "times_the_average_patient": context.multiple_of_baseline,
        }
        report["explanation"] = context.explanation

        # Recommendations are a clinician's tool. An administrator may read the
        # record but the access matrix does not give them care recommendations.
        if has_permission(_role(actor), Permission.CARE_RECOMMENDATION_GENERATE):
            report["recommendations"] = cds_service.evaluate(context)

    auth_service.record_audit(
        db, "report.patient_outcome", actor.id, actor.role, f"patient:{patient_id}"
    )
    db.commit()
    return report


def _role(actor: User) -> Any:
    from app.core.rbac import Role

    return Role(actor.role)


# --------------------------------------------------------------------------
# Hospital performance export
# --------------------------------------------------------------------------

PERFORMANCE_COLUMNS = [
    "dimension",
    "group",
    "admissions",
    "readmissions",
    "readmission_rate",
    "expected_readmissions",
    "observed_to_expected",
    "oe_ci_low",
    "oe_ci_high",
    "verdict",
    "average_length_of_stay",
    "home_discharge_rate",
]


def hospital_performance_rows(db: Session, actor: User) -> list[dict[str, Any]]:
    """Every performance dimension flattened into one table."""
    rows: list[dict[str, Any]] = []
    for dimension in performance_service.DIMENSIONS:
        block = performance_service.performance(db, actor, dimension, limit=200)
        for row in block["rows"]:
            if row.get("suppressed"):
                continue
            oe = row.get("observed_vs_expected") or {}
            rows.append(
                {
                    "dimension": block["dimension_title"],
                    "group": row["group"],
                    "admissions": row["admissions"],
                    "readmissions": row["readmissions"],
                    "readmission_rate": row["readmission_rate"],
                    "expected_readmissions": oe.get("expected"),
                    "observed_to_expected": oe.get("ratio"),
                    "oe_ci_low": oe.get("ci_low"),
                    "oe_ci_high": oe.get("ci_high"),
                    "verdict": oe.get("verdict"),
                    "average_length_of_stay": row["average_length_of_stay"],
                    "home_discharge_rate": row["home_discharge_rate"],
                }
            )
    return rows


def hospital_performance_export(db: Session, actor: User) -> tuple[str, int]:
    """CSV of the hospital performance tables, plus the row count. Audited."""
    rows = hospital_performance_rows(db, actor)
    preamble = [
        "HealthForecast AI - hospital performance export",
        f"Generated {datetime.now(UTC).isoformat(timespec='seconds')} for {actor.full_name}",
        "Aggregate values only. No patient-level data.",
        performance_service.MODEL_CAVEAT,
    ]
    auth_service.record_audit(
        db, "export.hospital_performance", actor.id, actor.role, f"rows:{len(rows)}"
    )
    db.commit()
    return to_csv(PERFORMANCE_COLUMNS, rows, preamble), len(rows)


# --------------------------------------------------------------------------
# Research dataset export
# --------------------------------------------------------------------------


def research_dataset_export(
    db: Session, actor: User, k: int = DEFAULT_K, limit: int = 50000
) -> tuple[str, dict[str, Any]]:
    """A de-identified, k-anonymous patient-level dataset as CSV. Audited.

    De-identification here is three steps: replace the MRN with a salted
    non-reversible pseudonym, drop every direct identifier, and suppress any row
    whose combination of quasi-identifiers appears fewer than k times in the
    release. The rows are emitted in pseudonym order, not database order, so row
    position reveals nothing.
    """
    latest = risk_service.latest_prediction_subquery()
    stmt = (
        select(Patient, Admission, RiskPrediction.readmission_probability)
        .join(Admission, Admission.patient_id == Patient.id)
        .outerjoin(latest, latest.c.patient_id == Patient.id)
        .outerjoin(RiskPrediction, RiskPrediction.id == latest.c.latest_id)
        .order_by(Patient.id)
        .limit(limit)
    )

    candidates: list[dict[str, Any]] = []
    for patient, admission, probability in db.execute(stmt):
        candidates.append(
            {
                "pseudo_id": patient_service.pseudonymise(patient.medical_record_number),
                "age_group": patient.age_group,
                "gender": patient.gender,
                "race": patient.race,
                "primary_diagnosis": patient.primary_diagnosis,
                "admission_type": admission.admission_type,
                "discharge_disposition": admission.discharge_disposition,
                "time_in_hospital": admission.time_in_hospital,
                "num_medications": admission.num_medications,
                "number_diagnoses": admission.number_diagnoses,
                "number_inpatient": admission.number_inpatient,
                "a1c_measured": admission.a1c_result is not None,
                "medication_changed": admission.medication_changed,
                "readmitted_within_30_days": 1 if admission.readmitted == "<30" else 0,
                "predicted_risk": None if probability is None else round(float(probability), 3),
            }
        )

    class_sizes = Counter(tuple(row[q] for q in QUASI_IDENTIFIERS) for row in candidates)
    released = [
        row for row in candidates if class_sizes[tuple(row[q] for q in QUASI_IDENTIFIERS)] >= k
    ]
    released.sort(key=lambda row: row["pseudo_id"])

    summary = {
        "k": k,
        "candidate_rows": len(candidates),
        "released_rows": len(released),
        "suppressed_rows": len(candidates) - len(released),
        "quasi_identifiers": list(QUASI_IDENTIFIERS),
    }

    preamble = [
        "HealthForecast AI - de-identified research dataset",
        f"Generated {datetime.now(UTC).isoformat(timespec='seconds')}",
        f"k-anonymity k={k} over {', '.join(QUASI_IDENTIFIERS)}.",
        f"{summary['suppressed_rows']} of {summary['candidate_rows']} rows suppressed for small groups.",
        "Pseudonyms are stable within this deployment and not reversible without the server secret.",
        "Do not attempt to re-identify individuals or link this file to other data.",
    ]

    auth_service.record_audit(
        db,
        "export.research_dataset",
        actor.id,
        actor.role,
        f"rows:{len(released)};k:{k}",
    )
    db.commit()
    return to_csv(RESEARCH_COLUMNS, released, preamble), summary
