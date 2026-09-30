"""End-to-end platform check - Milestone 4.

Drives a *running* deployment over HTTP, the way the frontend does, and walks the
journey a demonstration walks: each role signs in, sees only what it should, and
the headline features work on real data. It is skipped when no platform is
reachable, so it never fails a build that has nothing to test against.

    E2E_BASE_URL=http://localhost:8000 E2E_PASSWORD='<seed password>' \
        pytest tests/e2e -v

The accounts are the demo accounts created by `python -m app.db.init_db`.
Nothing here writes data except audit rows and one failed-login burst against a
throwaway address.
"""

from __future__ import annotations

import os
import uuid

import httpx
import pytest

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE}/api/v1"
PASSWORD = os.environ.get("E2E_PASSWORD", "")

ACCOUNTS = {
    "system_admin": "admin@healthforecast.org",
    "doctor": "dr.reddy@healthforecast.org",
    "hospital_admin": "admin.ops@healthforecast.org",
    "researcher": "researcher@healthforecast.org",
}


def reachable() -> bool:
    try:
        return httpx.get(f"{BASE}/health", timeout=3).status_code == 200
    except httpx.HTTPError:
        return False


pytestmark = pytest.mark.skipif(
    not reachable() or not PASSWORD, reason="no platform reachable, or E2E_PASSWORD not set"
)


@pytest.fixture(scope="module")
def client() -> httpx.Client:
    with httpx.Client(base_url=API, timeout=60) as session:
        yield session


@pytest.fixture(scope="module")
def tokens(client: httpx.Client) -> dict[str, str]:
    out = {}
    for role, email in ACCOUNTS.items():
        response = client.post("/auth/login", json={"email": email, "password": PASSWORD})
        assert response.status_code == 200, f"{role} could not sign in"
        out[role] = response.json()["access_token"]
    return out


def get(client: httpx.Client, tokens: dict[str, str], role: str, path: str) -> httpx.Response:
    return client.get(path, headers={"Authorization": f"Bearer {tokens[role]}"})


# --------------------------------------------------------------------------
# Deployment health
# --------------------------------------------------------------------------


def test_the_api_is_healthy_and_hardened() -> None:
    response = httpx.get(f"{BASE}/health", timeout=5)
    assert response.json()["status"] == "ok"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_a_model_is_loaded_and_scores(client, tokens) -> None:
    patient = get(client, tokens, "doctor", "/patients?limit=1").json()["items"][0]["id"]
    response = client.post(
        "/risk/predict",
        json={
            "patient_id": patient,
            "time_in_hospital": 9,
            "number_inpatient": 3,
            "num_medications": 20,
        },
        headers={"Authorization": f"Bearer {tokens['doctor']}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert 0 < body["readmission_probability"] < 1
    assert body["risk_category"] in {"low", "medium", "high"}


def test_a_request_without_a_token_is_refused(client) -> None:
    assert client.get("/patients").status_code == 401


# --------------------------------------------------------------------------
# Role journeys
# --------------------------------------------------------------------------


def test_a_doctor_sees_only_their_own_patients(client, tokens) -> None:
    mine = get(client, tokens, "doctor", "/patients?limit=100").json()
    everyone = get(client, tokens, "hospital_admin", "/patients?limit=100").json()
    assert 0 < mine["total"] < everyone["total"]


def test_a_doctor_gets_care_recommendations_with_reasons(client, tokens) -> None:
    patients = get(client, tokens, "doctor", "/patients?limit=1").json()["items"]
    body = get(
        client, tokens, "doctor", f"/clinical-support/recommendations/{patients[0]['id']}"
    ).json()
    assert body["clinical_review_required"] is True
    assert body["recommendations"], "a scored patient should get at least a follow-up"
    assert all(r["rationale"] and r["evidence"] for r in body["recommendations"])


def test_an_administrator_sees_hospital_performance(client, tokens) -> None:
    report = get(client, tokens, "hospital_admin", "/analytics/performance").json()
    ratio = report["overall"]["observed_vs_expected"]["ratio"]
    assert 0.8 < ratio < 1.2, "expected readmissions should be close to observed overall"
    assert get(client, tokens, "hospital_admin", "/analytics/trends").status_code == 200


def test_the_administrator_cannot_read_a_care_plan(client, tokens) -> None:
    assert get(client, tokens, "hospital_admin", "/clinical-support/rules").status_code == 403


def test_treatment_analysis_reports_its_own_limits(client, tokens) -> None:
    report = get(client, tokens, "hospital_admin", "/treatment").json()
    assert "not a trial" in report["caveat"].lower() or "observational" in report["caveat"].lower()
    assert report["medications"]


def test_a_researcher_gets_an_anonymous_dataset_and_no_identifiers(client, tokens) -> None:
    response = get(client, tokens, "researcher", "/reports/research-dataset?k=10")
    assert response.status_code == 200
    assert response.headers["x-k-anonymity"] == "10"
    assert "MRN-" not in response.text
    assert get(client, tokens, "researcher", "/patients").status_code == 403


def test_only_the_system_administrator_manages_users(client, tokens) -> None:
    assert get(client, tokens, "system_admin", "/users").status_code == 200
    for role in ("doctor", "hospital_admin", "researcher"):
        assert get(client, tokens, role, "/users").status_code == 403


# --------------------------------------------------------------------------
# Security behaviour
# --------------------------------------------------------------------------


def test_repeated_failed_sign_ins_are_locked_out(client) -> None:
    # A fresh address each run: a fixed one would already be locked from the last run.
    address = f"e2e-probe-{uuid.uuid4().hex[:10]}@example.org"
    codes = [
        client.post("/auth/login", json={"email": address, "password": "nope"}).status_code
        for _ in range(7)
    ]
    assert codes[:5] == [401] * 5
    assert 429 in codes[5:]


def test_reading_a_record_leaves_an_audit_row(client, tokens) -> None:
    patient = get(client, tokens, "doctor", "/patients?limit=1").json()["items"][0]["id"]
    get(client, tokens, "doctor", f"/patients/{patient}")
    audit = get(client, tokens, "system_admin", "/audit?action=patient.read&limit=5")
    assert audit.status_code == 200
    assert audit.json()["total"] > 0
    assert get(client, tokens, "doctor", "/audit").status_code == 403
