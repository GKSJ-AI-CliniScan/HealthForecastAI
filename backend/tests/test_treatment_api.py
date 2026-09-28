"""Tests for treatment effectiveness API endpoints."""

from app.core.rbac import Role
from app.models.admission import Admission
from app.models.treatment import TreatmentOutcome


def test_treatment_effectiveness_returns_rollups(client, db_session, users, patients, auth_header):
    """Treatment endpoint should return effectiveness metrics grouped by treatment."""

    admissions = db_session.query(Admission).order_by(Admission.id).all()

    db_session.add_all(
        [
            TreatmentOutcome(
                admission_id=admissions[0].id,
                treatment_name="Treatment A",
                recovery_score=80.0,
                length_of_stay_days=6,
                outcome="recovered",
            ),
            TreatmentOutcome(
                admission_id=admissions[1].id,
                treatment_name="Treatment A",
                recovery_score=90.0,
                length_of_stay_days=5,
                outcome="recovered",
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        "/api/v1/treatment",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]["treatment_name"] == "Treatment A"
    assert data[0]["patients_treated"] == 2
    assert data[0]["average_recovery_score"] == 85.0
    assert data[0]["readmission_rate"] == 50.0


def test_recovery_trends_returns_weekly_scores(client, db_session, patients, auth_header):
    """Recovery trends should return recovery scores over time."""

    admissions = db_session.query(Admission).order_by(Admission.id).all()

    db_session.add_all(
        [
            TreatmentOutcome(
                admission_id=admissions[0].id,
                treatment_name="Treatment A",
                recovery_score=80.0,
            ),
            TreatmentOutcome(
                admission_id=admissions[0].id,
                treatment_name="Treatment B",
                recovery_score=90.0,
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        "/api/v1/treatment/recovery-trends",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )

    assert response.status_code == 200
    data = response.json()

    assert len(data) == 1
    assert data[0]["recovery_score"] == 85.0
