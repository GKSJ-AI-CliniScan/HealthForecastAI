"""End-to-end API regression suite against a RUNNING backend and its database.

Skipped unless HFAI_E2E_BASE_URL is set, so CI and the normal in-memory test
run are unaffected. Credentials are never stored here - export one account
per role first:

    HFAI_E2E_BASE_URL=http://localhost:8000/api/v1
    HFAI_E2E_SYSTEM_ADMIN_EMAIL / HFAI_E2E_SYSTEM_ADMIN_PASSWORD
    HFAI_E2E_DOCTOR_EMAIL / HFAI_E2E_DOCTOR_PASSWORD
    HFAI_E2E_HOSPITAL_ADMIN_EMAIL / HFAI_E2E_HOSPITAL_ADMIN_PASSWORD
    HFAI_E2E_RESEARCHER_EMAIL / HFAI_E2E_RESEARCHER_PASSWORD
    HFAI_E2E_DATABASE_URL (optional; defaults to settings.DATABASE_URL)

    cd backend && pytest tests/e2e -q

No assertion depends on a fixed record count: expected values are read from
the database itself (an oracle independent of the API), and test data is
discovered rather than assumed. Reports a test creates are deleted when the
test finishes. Risk/readmission predictions requested here are kept - they
are append-only history with no delete endpoint, and no assertion counts them.
"""

import csv
import io
import os
from collections.abc import Callable, Iterator
from typing import Any

import httpx
import pytest
from sqlalchemy import create_engine, text

from app.core.config import settings

BASE_URL = os.environ.get("HFAI_E2E_BASE_URL")
ROLES = ("SYSTEM_ADMIN", "DOCTOR", "HOSPITAL_ADMIN", "RESEARCHER")

pytestmark = pytest.mark.skipif(
    not BASE_URL, reason="E2E suite: set HFAI_E2E_BASE_URL (and role credentials) to run"
)

DOCTOR_SCOPE_SQL = (
    "SELECT p.id FROM patients p WHERE p.assigned_doctor_id = :doctor OR EXISTS ("
    "SELECT 1 FROM doctor_patient_map m WHERE m.patient_id = p.id AND m.doctor_id = :doctor)"
)
REPORT_MAGIC = {"csv": b"Report,", "xlsx": b"PK", "pdf": b"%PDF-"}
NO_SUCH_DIAGNOSIS = "zz-e2e-no-such-diagnosis"


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------


@pytest.fixture(scope="module")
def api() -> Iterator[httpx.Client]:
    assert BASE_URL is not None
    with httpx.Client(base_url=BASE_URL, timeout=120) as client:
        yield client


@pytest.fixture(scope="module")
def db() -> Iterator[Callable[..., Any]]:
    """Return a scalar-query helper over the backend's own database."""
    engine = create_engine(os.environ.get("HFAI_E2E_DATABASE_URL", settings.DATABASE_URL))

    def scalar(sql: str, **params: Any) -> Any:
        with engine.connect() as conn:
            return conn.execute(text(sql), params).scalar()

    yield scalar
    engine.dispose()


@pytest.fixture(scope="module")
def headers(api: httpx.Client) -> dict[str, dict[str, str]]:
    """Bearer headers per role, from HFAI_E2E_<ROLE>_EMAIL/_PASSWORD."""
    result: dict[str, dict[str, str]] = {}
    for role in ROLES:
        email = os.environ.get(f"HFAI_E2E_{role}_EMAIL")
        password = os.environ.get(f"HFAI_E2E_{role}_PASSWORD")
        if not email or not password:
            pytest.skip(f"set HFAI_E2E_{role}_EMAIL and HFAI_E2E_{role}_PASSWORD")
        response = api.post("/auth/login", json={"email": email, "password": password})
        assert response.status_code == 200, f"{role} login failed: {response.status_code}"
        result[role.lower()] = {"Authorization": f"Bearer {response.json()['access_token']}"}
    return result


@pytest.fixture(scope="module")
def sa(headers: dict[str, dict[str, str]]) -> dict[str, str]:
    return headers["system_admin"]


@pytest.fixture(scope="module")
def dr(headers: dict[str, dict[str, str]]) -> dict[str, str]:
    return headers["doctor"]


@pytest.fixture(scope="module")
def ha(headers: dict[str, dict[str, str]]) -> dict[str, str]:
    return headers["hospital_admin"]


@pytest.fixture(scope="module")
def rs(headers: dict[str, dict[str, str]]) -> dict[str, str]:
    return headers["researcher"]


@pytest.fixture(scope="module")
def doctor_id(api: httpx.Client, dr: dict[str, str]) -> int:
    me = api.get("/auth/me", headers=dr).json()
    assert me["role"] == "doctor"
    return int(me["profile"]["id"])


@pytest.fixture(scope="module")
def scope(api: httpx.Client, dr: dict[str, str], sa: dict[str, str], db, doctor_id) -> dict:
    """Discover a doctor-owned patient with admissions and an out-of-scope one."""
    own_ids = [p["id"] for p in api.get("/patients?limit=200", headers=dr).json()]
    own = next(
        (pid for pid in own_ids if api.get(f"/patients/{pid}/admissions", headers=dr).json()),
        None,
    )
    if own is None:
        pytest.skip("the doctor account needs at least one assigned patient with an admission")
    admissions = api.get(f"/patients/{own}/admissions", headers=dr).json()
    other = db(
        f"SELECT min(id) FROM patients WHERE id NOT IN ({DOCTOR_SCOPE_SQL})", doctor=doctor_id
    )
    if other is None:
        pytest.skip("need at least one patient outside the doctor's scope")
    return {"own": own, "own_admission": admissions[0]["id"], "other": other}


@pytest.fixture
def make_report(api: httpx.Client) -> Iterator[Callable[..., dict]]:
    """Generate reports for a test and delete exactly those afterwards."""
    created: list[tuple[int, dict[str, str]]] = []

    def generate(owner: dict[str, str], report_type: str, fmt: str, **filters: Any) -> dict:
        response = api.post(
            "/reports/generate",
            headers=owner,
            json={"report_type": report_type, "format": fmt, "filters": filters},
        )
        assert response.status_code == 201, response.text
        body = response.json()
        created.append((body["id"], owner))
        return body

    yield generate
    for report_id, owner in created:
        api.delete(f"/reports/{report_id}", headers=owner)


def _ids(api: httpx.Client, owner: dict[str, str]) -> set[int]:
    return {r["id"] for r in api.get("/reports?limit=200", headers=owner).json()}


# --------------------------------------------------------------------------
# Authentication
# --------------------------------------------------------------------------


def test_invalid_credentials_and_tokens_are_refused(api: httpx.Client) -> None:
    assert (
        api.post(
            "/auth/login", json={"email": "nobody@e2e.invalid.org", "password": "x"}
        ).status_code
        == 401
    )
    assert api.get("/patients").status_code == 401
    assert api.get("/patients", headers={"Authorization": "Bearer a.b.c"}).status_code == 401


@pytest.mark.parametrize("role", ["system_admin", "doctor", "hospital_admin", "researcher"])
def test_each_account_resolves_to_its_role(api: httpx.Client, headers, role: str) -> None:
    assert api.get("/auth/me", headers=headers[role]).json()["role"] == role


# --------------------------------------------------------------------------
# Milestone 1 - patients, admissions, scoping
# --------------------------------------------------------------------------


def test_hospital_wide_roles_see_every_patient(api: httpx.Client, sa, ha, db) -> None:
    total = db("SELECT count(*) FROM patients")
    for role_headers in (sa, ha):
        response = api.get("/patients?limit=1", headers=role_headers)
        assert response.status_code == 200
        assert int(response.headers["x-total-count"]) == total


def test_doctor_sees_exactly_their_scope(api: httpx.Client, dr, db, doctor_id) -> None:
    response = api.get("/patients?limit=1", headers=dr)
    expected = db(f"SELECT count(*) FROM ({DOCTOR_SCOPE_SQL}) s", doctor=doctor_id)
    assert int(response.headers["x-total-count"]) == expected


def test_out_of_scope_and_missing_patients_are_404(api: httpx.Client, dr, sa, scope) -> None:
    assert api.get(f"/patients/{scope['own']}", headers=dr).status_code == 200
    assert api.get(f"/patients/{scope['other']}", headers=dr).status_code == 404
    missing = 1 + int(api.get("/patients?limit=1", headers=sa).headers["x-total-count"]) * 1000
    assert api.get(f"/patients/{missing}", headers=sa).status_code == 404


def test_researcher_never_reaches_identifiable_records(api: httpx.Client, rs, scope) -> None:
    assert api.get("/patients", headers=rs).status_code == 403
    assert api.get(f"/patients/{scope['own']}", headers=rs).status_code == 403


def test_admissions_and_treatments_load_for_an_own_patient(api: httpx.Client, dr, scope) -> None:
    own = scope["own"]
    assert api.get(f"/patients/{own}/admissions", headers=dr).status_code == 200
    assert api.get(f"/patients/{own}/admissions/readmissions", headers=dr).status_code == 200
    treatments = api.get(
        f"/patients/{own}/admissions/{scope['own_admission']}/treatments", headers=dr
    )
    assert treatments.status_code == 200


def test_only_system_admin_writes_patients_and_manages_users(api: httpx.Client, dr, ha, sa) -> None:
    for role_headers in (dr, ha):
        attempt = api.post(
            "/patients", headers=role_headers, json={"medical_record_number": "E2E-X"}
        )
        assert attempt.status_code == 403
    assert api.get("/users", headers=sa).status_code == 200
    assert api.get("/users", headers=ha).status_code == 403


def test_assigned_doctor_is_exposed_by_name_only(api: httpx.Client, dr, scope) -> None:
    body = api.get(f"/patients/{scope['own']}", headers=dr).json()
    assert body["assigned_doctor_name"]
    assert "@" not in str(body["assigned_doctor_name"])


# --------------------------------------------------------------------------
# Milestone 2 - inference, CDS, model registry
# --------------------------------------------------------------------------


def test_predictions_are_served_by_the_active_models(api: httpx.Client, dr, sa, scope) -> None:
    active = {m["model_name"]: m["version"] for m in api.get("/models/active", headers=sa).json()}
    assert set(active) == {"risk", "readmission"}

    risk = api.post("/risk/predict", headers=dr, json={"patient_id": scope["own"]})
    assert risk.status_code == 200
    assert risk.json()["risk_category"] in {"low", "medium", "high"}
    assert 0.0 <= risk.json()["readmission_probability"] <= 1.0
    assert risk.json()["model_version"] == active["risk"]

    forecast = api.post(
        "/risk/readmission",
        headers=dr,
        json={"patient_id": scope["own"], "admission_id": scope["own_admission"]},
    )
    assert forecast.status_code == 200
    assert forecast.json()["readmission_window"] == "30_day"
    assert forecast.json()["model_version"] == active["readmission"]


def test_active_models_carry_real_data_provenance(api: httpx.Client, sa) -> None:
    """Active artefacts must be the registered production versions with metrics."""
    for model in api.get("/models/active", headers=sa).json():
        assert model["status"] == "production"
        assert model["roc_auc"] is not None and model["roc_auc"] >= 0.65


def test_prediction_rbac(api: httpx.Client, dr, ha, rs, scope) -> None:
    assert (
        api.post("/risk/predict", headers=dr, json={"patient_id": scope["other"]}).status_code
        == 404
    )
    assert (
        api.post("/risk/predict", headers=ha, json={"patient_id": scope["own"]}).status_code == 403
    )
    assert (
        api.post(
            "/risk/readmission",
            headers=rs,
            json={"patient_id": scope["own"], "admission_id": scope["own_admission"]},
        ).status_code
        == 403
    )
    assert api.get("/risk/high-risk", headers=dr).status_code == 200
    assert api.get("/risk/high-risk", headers=ha).status_code == 403


def test_history_forecast_and_cds(api: httpx.Client, dr, ha, scope) -> None:
    own = scope["own"]
    api.post("/risk/predict", headers=dr, json={"patient_id": own})
    assert api.get(f"/risk/{own}/history", headers=dr).json()
    assert api.get(f"/risk/{own}/history?type=readmission", headers=ha).status_code == 200
    assert api.get("/risk/forecast", headers=ha).status_code == 200
    recommendations = api.get(f"/clinical-support/recommendations/{own}", headers=dr)
    assert recommendations.status_code == 200 and recommendations.json()["recommendations"]
    assert api.get(f"/clinical-support/discharge-plan/{own}", headers=dr).status_code == 200
    assert api.get(f"/clinical-support/recommendations/{own}", headers=ha).status_code == 403
    assert (
        api.get(f"/clinical-support/recommendations/{scope['other']}", headers=dr).status_code
        == 404
    )
    assert api.get("/models", headers=ha).status_code == 403


# --------------------------------------------------------------------------
# Milestone 3 - analytics
# --------------------------------------------------------------------------


def test_summary_and_discharge_outcomes_match_the_database(api: httpx.Client, ha, db) -> None:
    summary = api.get("/analytics/summary", headers=ha).json()
    assert summary["total_patients"] == db("SELECT count(*) FROM patients")
    assert summary["total_admissions"] == db("SELECT count(*) FROM admissions")
    outcomes = api.get("/analytics/discharge-outcomes", headers=ha).json()["distribution"]
    assert sum(outcomes.values()) == db("SELECT count(*) FROM admissions")


def test_departments_match_and_sort(api: httpx.Client, ha, db) -> None:
    rows = api.get("/analytics/departments?sort_by=readmission_rate&order=desc", headers=ha).json()
    assert len(rows) == db(
        "SELECT count(DISTINCT coalesce(department, 'unassigned')) FROM admissions"
    )
    rates = [r["readmission_rate"] for r in rows]
    assert rates == sorted(rates, reverse=True)
    window = api.get("/analytics/departments?date_from=2026-01-01&date_to=2026-01-31", headers=ha)
    assert sum(r["total_admissions"] for r in window.json()) == db(
        "SELECT count(*) FROM admissions WHERE admission_date BETWEEN '2026-01-01' AND '2026-01-31'"
    )


def test_analytics_validation_errors(api: httpx.Client, ha) -> None:
    inverted = api.get("/analytics/departments?date_from=2026-03-01&date_to=2026-01-01", headers=ha)
    assert inverted.status_code == 422
    assert api.get("/analytics/departments?sort_by=name", headers=ha).status_code == 422
    assert api.get("/analytics/trends?metric=nope", headers=ha).status_code == 422


def test_trends_and_population_health(api: httpx.Client, ha, db) -> None:
    assert api.get("/analytics/trends?metric=outcome", headers=ha).status_code == 200
    risk = api.get("/analytics/trends?metric=risk&months=60", headers=ha).json()
    assert sum(point["total"] for point in risk) >= 1
    population = api.get("/analytics/population-health", headers=ha)
    if db("SELECT count(*) FROM patients") < 10:
        assert population.status_code == 422
    else:
        body = population.json()
        assert body["total_patients"] == db("SELECT count(*) FROM patients")
        ages = body["demographic_distribution"]["age_group"]
        assert all("-" in band or band == "unknown" or not band[:1].isdigit() for band in ages)


def test_analytics_rbac(api: httpx.Client, dr, rs) -> None:
    for path in ("/analytics/summary", "/analytics/departments", "/analytics/population-health"):
        assert api.get(path, headers=dr).status_code == 403
    assert api.get("/analytics/summary", headers=rs).status_code == 200


# --------------------------------------------------------------------------
# Treatment effectiveness
# --------------------------------------------------------------------------


def test_treatment_totals_and_doctor_scope(api: httpx.Client, ha, dr, db, doctor_id) -> None:
    hospital = api.get("/treatment", headers=ha).json()
    assert sum(r["sample_size"] for r in hospital) == db("SELECT count(*) FROM treatment_outcomes")
    own = api.get("/treatment", headers=dr).json()
    assert sum(r["sample_size"] for r in own) == db(
        "SELECT count(*) FROM treatment_outcomes t JOIN admissions a ON a.id = t.admission_id "
        f"WHERE a.patient_id IN ({DOCTOR_SCOPE_SQL})",
        doctor=doctor_id,
    )


def test_treatment_views_and_guards(api: httpx.Client, ha, rs, db) -> None:
    assert api.get("/treatment/outcomes", headers=ha).status_code == 200
    assert api.get("/treatment/departments", headers=ha).status_code == 200
    assert api.get("/treatment/recovery-trends?weeks=26", headers=ha).status_code == 200
    assert api.get("/treatment", headers=rs).status_code == 200
    small = api.get(f"/treatment/compare?diagnosis={NO_SUCH_DIAGNOSIS}", headers=ha)
    assert small.status_code == 422 and small.json()["detail"]["error"] == "cohort_too_small"
    assert (
        api.get(
            f"/treatment/readmission-reduction?treatment_name={NO_SUCH_DIAGNOSIS}", headers=ha
        ).status_code
        == 404
    )
    diagnosis = db(
        "SELECT p.primary_diagnosis FROM treatment_outcomes t JOIN admissions a ON a.id = "
        "t.admission_id JOIN patients p ON p.id = a.patient_id WHERE p.primary_diagnosis "
        "IS NOT NULL GROUP BY p.primary_diagnosis HAVING count(*) >= 5 LIMIT 1"
    )
    if diagnosis:
        compare = api.get("/treatment/compare", params={"diagnosis": diagnosis}, headers=ha)
        assert compare.status_code == 200 and compare.json()


# --------------------------------------------------------------------------
# Research - anonymisation, cohort guard, export
# --------------------------------------------------------------------------


def test_anonymised_cohort_exposes_no_identifiers(api: httpx.Client, rs, db) -> None:
    response = api.get("/patients/anonymised?limit=1000", headers=rs)
    total = db("SELECT count(*) FROM patients")
    if total < 10:
        assert response.status_code == 422
        return
    rows = response.json()
    assert int(response.headers["x-total-count"]) == total
    assert set(rows[0]) == {"pseudo_id", "age_group", "gender", "primary_diagnosis"}
    for row in rows[:50]:
        assert (
            db("SELECT count(*) FROM patients WHERE medical_record_number = :m", m=row["pseudo_id"])
            == 0
        )


def test_cohort_filters_and_minimum_size(api: httpx.Client, rs, db) -> None:
    gender = db(
        "SELECT gender FROM patients WHERE gender IS NOT NULL GROUP BY gender ORDER BY count(*) DESC LIMIT 1"
    )
    expected = db("SELECT count(*) FROM patients WHERE lower(gender) = lower(:g)", g=gender)
    stats = api.get("/analytics/research-cohort", params={"gender": gender}, headers=rs)
    if expected < 10:
        assert stats.status_code == 422
    else:
        assert stats.json()["cohort_size"] == expected
        export = api.get("/analytics/research-export", params={"gender": gender}, headers=rs)
        assert export.headers["content-type"].startswith("text/csv")
        rows = list(csv.DictReader(io.StringIO(export.text)))
        assert len(rows) == expected
        assert {r["gender"].lower() for r in rows} == {gender.lower()}

    tiny = api.get(
        "/analytics/research-cohort", params={"diagnosis": NO_SUCH_DIAGNOSIS}, headers=rs
    )
    assert tiny.status_code == 422 and tiny.json()["detail"]["error"] == "cohort_too_small"
    blocked = api.get(
        "/analytics/research-export", params={"diagnosis": NO_SUCH_DIAGNOSIS}, headers=rs
    )
    assert blocked.status_code == 422


def test_research_rbac(api: httpx.Client, ha, dr) -> None:
    assert api.get("/analytics/research-export", headers=ha).status_code == 403
    assert api.get("/patients/anonymised", headers=ha).status_code == 403
    assert api.get("/analytics/research-cohort", headers=dr).status_code == 403


# --------------------------------------------------------------------------
# Reports - generation, downloads, ownership; self-isolated
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("owner_role", "report_type", "fmt"),
    [
        ("hospital_admin", "readmission_analytics", "pdf"),
        ("hospital_admin", "department_performance", "xlsx"),
        ("researcher", "research_cohort", "csv"),
        ("researcher", "treatment_effectiveness", "pdf"),
    ],
)
def test_reports_generate_and_download_real_files(
    api: httpx.Client, headers, make_report, owner_role: str, report_type: str, fmt: str
) -> None:
    owner = headers[owner_role]
    report = make_report(owner, report_type, fmt)
    download = api.get(f"/reports/{report['id']}/download", headers=owner)
    assert download.status_code == 200
    assert download.content.startswith(REPORT_MAGIC[fmt])


def test_report_history_is_isolated_and_owner_scoped(
    api: httpx.Client, ha, rs, sa, db, make_report
) -> None:
    before = {"ha": _ids(api, ha), "rs": _ids(api, rs)}
    mine_ha = {make_report(ha, "risk_distribution", "csv")["id"]}
    mine_rs = {make_report(rs, "research_cohort", "csv")["id"]}

    assert _ids(api, ha) == before["ha"] | mine_ha
    assert _ids(api, rs) == before["rs"] | mine_rs
    assert not (_ids(api, rs) & mine_ha)
    for report_id in mine_ha:
        assert api.get(f"/reports/{report_id}", headers=rs).status_code == 404
        assert api.get(f"/reports/{report_id}/download", headers=rs).status_code == 404

    everyone = api.get("/reports?limit=200", headers=sa)
    assert int(everyone.headers["x-total-count"]) == db("SELECT count(*) FROM reports")
    assert (mine_ha | mine_rs) <= {r["id"] for r in everyone.json()}


def test_report_cleanup_restores_the_previous_set(api: httpx.Client, ha, sa) -> None:
    before = _ids(api, sa)
    report = api.post(
        "/reports/generate",
        headers=ha,
        json={"report_type": "risk_distribution", "format": "pdf", "filters": {}},
    ).json()
    assert api.delete(f"/reports/{report['id']}", headers=ha).status_code == 204
    assert api.get(f"/reports/{report['id']}/download", headers=ha).status_code == 404
    assert _ids(api, sa) == before


def test_report_validation_and_permissions(api: httpx.Client, ha, rs, dr, sa) -> None:
    bad_filter = {"report_type": "population_health", "format": "pdf", "filters": {"months": 3}}
    assert api.post("/reports/generate", headers=ha, json=bad_filter).status_code == 422
    bad_format = {"report_type": "population_health", "format": "docx"}
    assert api.post("/reports/generate", headers=ha, json=bad_format).status_code == 422
    small = {
        "report_type": "research_cohort",
        "format": "csv",
        "filters": {"diagnosis": NO_SUCH_DIAGNOSIS},
    }
    response = api.post("/reports/generate", headers=rs, json=small)
    assert response.status_code == 422 and response.json()["detail"]["error"] == "cohort_too_small"
    assert api.get("/reports", headers=dr).status_code == 403
    assert api.post("/reports/purge", headers=ha).status_code == 403
    assert api.get("/reports/999999999", headers=sa).status_code == 404
