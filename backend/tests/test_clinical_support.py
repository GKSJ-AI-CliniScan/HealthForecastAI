from app.core.rbac import Role
from app.models.prediction import RiskPrediction
from app.models.treatment import TreatmentOutcome


def test_care_recommendations_for_high_risk_patient(
    client, db_session, patients, users, auth_header
):
    patient = patients[0]

    db_session.add(
        RiskPrediction(
            patient_id=patient.id,
            readmission_probability=0.85,
            risk_category="high",
            model_name="test-model",
            model_version="1.0",
        )
    )
    db_session.commit()

    response = client.get(
        f"/api/v1/clinical-support/recommendations/{patient.id}",
        headers=auth_header(Role.DOCTOR),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["patient_id"] == patient.id
    assert len(data["recommendations"]) > 0
    assert data["follow_up_days"] == 7


def test_discharge_plan_for_patient_with_good_recovery(
    client, db_session, patients, auth_header
):
    patient = patients[0]

    admission = patient.admissions[0]

    db_session.add(
        RiskPrediction(
            patient_id=patient.id,
            readmission_probability=0.20,
            risk_category="low",
            model_name="test-model",
            model_version="1.0",
        )
    )

    db_session.add(
        TreatmentOutcome(
            admission_id=admission.id,
            treatment_name="Treatment A",
            medication_change=False,
            recovery_score=90.0,
            length_of_stay_days=6,
            outcome="recovered",
        )
    )

    db_session.commit()

    response = client.get(
        f"/api/v1/clinical-support/discharge-plan/{patient.id}",
        headers=auth_header(Role.DOCTOR),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["patient_id"] == patient.id
    assert data["ready_for_discharge"] is True
    assert len(data["risk_mitigation"]) > 0


def test_clinical_support_requires_permission(client, patients, auth_header):
    patient = patients[0]

    response = client.get(
        f"/api/v1/clinical-support/recommendations/{patient.id}",
        headers=auth_header(Role.RESEARCHER),
    )

    assert response.status_code == 403