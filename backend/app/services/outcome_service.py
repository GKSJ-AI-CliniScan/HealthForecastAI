"""Business logic for patient recovery and outcome analytics."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.admission import Admission


OUTCOME_LABELS = {
    "NO": "No Readmission",
    ">30": "Readmitted After 30 Days",
    "<30": "Readmitted Within 30 Days",
}


def get_outcome_profile(
    db: Session,
) -> list[dict[str, float | int | str]]:
    """Return observed patient profiles grouped by readmission outcome."""

    stmt = (
        select(
            Admission.readmitted,
            func.count(Admission.id).label("patients"),
            func.avg(Admission.time_in_hospital).label(
                "average_time_in_hospital"
            ),
            func.avg(Admission.number_inpatient).label(
                "average_number_inpatient"
            ),
            func.avg(Admission.number_emergency).label(
                "average_number_emergency"
            ),
            func.avg(Admission.num_medications).label(
                "average_num_medications"
            ),
            func.avg(Admission.num_lab_procedures).label(
                "average_num_lab_procedures"
            ),
            func.avg(Admission.number_diagnoses).label(
                "average_number_diagnoses"
            ),
        )
        .where(Admission.readmitted.is_not(None))
        .group_by(Admission.readmitted)
        .order_by(Admission.readmitted)
    )

    rows = db.execute(stmt).all()

    return [
        {
            "outcome_status": OUTCOME_LABELS.get(
                row.readmitted,
                row.readmitted,
            ),
            "patients": row.patients,
            "average_time_in_hospital": float(
                row.average_time_in_hospital or 0.0
            ),
            "average_number_inpatient": float(
                row.average_number_inpatient or 0.0
            ),
            "average_number_emergency": float(
                row.average_number_emergency or 0.0
            ),
            "average_number_outpatient": 0.0,
            "average_num_medications": float(
                row.average_num_medications or 0.0
            ),
            "average_num_lab_procedures": float(
                row.average_num_lab_procedures or 0.0
            ),
            "average_num_procedures": 0.0,
            "average_number_diagnoses": float(
                row.average_number_diagnoses or 0.0
            ),
        }
        for row in rows
    ]