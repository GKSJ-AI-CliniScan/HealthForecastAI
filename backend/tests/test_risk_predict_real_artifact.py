"""A18: regression guard for the exact class of bug N5 found at P6.

Every test in test_risk_api.py monkeypatches model_service.predict_probability
itself, which is precisely why the real artefact/REQUEST_FEATURES mismatch
survived 90 green tests before P6 (see A19 / the P6 checkpoint). This test
goes through the real HTTP endpoint with the real, currently-trained
artefact loaded - no mocking of the prediction path at all - so the same
class of bug cannot silently return.

Skips cleanly (not a failure) when no artefact has been trained yet - a
fresh clone, or CI before `cd ml && python -m src.models.train` has run -
so this stays a real regression guard on a machine that has trained a
model, without turning "no model yet" into a red build everywhere else.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.rbac import Role
from app.models.patient import Patient
from app.services import model_service


def test_risk_predict_works_against_the_real_trained_artifact(
    client: TestClient, auth_header, patients: list[Patient]
) -> None:
    model_service.reset_cache()
    if not model_service.is_available():
        pytest.skip(
            "No trained artefact at MODEL_ARTIFACT_DIR - run "
            "`cd ml && python -m src.models.train` first."
        )

    payload = {
        "patient_id": patients[0].id,
        "time_in_hospital": 6,
        "num_medications": 12,
        "num_lab_procedures": 41,
        "number_diagnoses": 7,
        "number_inpatient": 1,
        "number_emergency": 0,
        "age_group": "[70-80)",
    }
    try:
        response = client.post(
            "/api/v1/risk/predict", json=payload, headers=auth_header(Role.DOCTOR)
        )
        assert response.status_code == 200, response.json()
        body = response.json()
        assert 0.0 <= body["readmission_probability"] <= 1.0
        assert body["risk_category"] in ("low", "medium", "high")
        assert body["model_version"] != "0.0.0-placeholder"

        # N7/A18 finding: predict_risk always calls cds_service.generate_insights
        # against the real loaded pipeline too, but no test asserted anything
        # about the result - this path was exercised, not verified. All seven
        # REQUEST_FEATURES have non-zero importance in the real promoted
        # model (see the A20 evidence file's ranked table), so this must be
        # non-empty, not just "didn't crash".
        assert len(body["insights"]) > 0
        for item in body["insights"]:
            assert "associated with" in item["association"]
    finally:
        model_service.reset_cache()
