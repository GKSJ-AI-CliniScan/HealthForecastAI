"""Analytics, treatment effectiveness and researcher privacy."""

from fastapi.testclient import TestClient

from app.core.rbac import Role
from app.services.analytics_service import MIN_GROUP_SIZE


def test_summary_risk_distribution_adds_up(client: TestClient, auth_header) -> None:
    """The low, medium and high counts add up to the number of patients."""
    body = client.get("/api/v1/analytics/summary", headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    assert body["total_patients"] > 0
    assert sum(body["risk_distribution"].values()) == body["total_patients"]
    assert 0.0 <= body["readmission_rate"] <= 1.0


def test_readmission_series_is_ordered_by_month(client: TestClient, auth_header) -> None:
    """Months come back oldest first."""
    rows = client.get("/api/v1/analytics/readmissions", headers=auth_header(Role.HOSPITAL_ADMIN))
    months = [row["month"] for row in rows.json()]
    assert months == sorted(months)


def test_population_health_has_no_small_groups(client: TestClient, auth_header) -> None:
    """Only aggregate cohorts at or above the minimum size are returned."""
    body = client.get("/api/v1/analytics/population-health", headers=auth_header(Role.RESEARCHER))
    assert body.status_code == 200
    assert all(c["patients"] >= MIN_GROUP_SIZE for c in body.json()["cohorts"])


def test_population_health_is_denied_to_doctor(client: TestClient, auth_header) -> None:
    """Doctors do not have population health access."""
    response = client.get("/api/v1/analytics/population-health", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 403


def test_csv_export_downloads_a_file(client: TestClient, auth_header) -> None:
    """Hospital administrators can export the readmission series."""
    response = client.get("/api/v1/analytics/export", headers=auth_header(Role.HOSPITAL_ADMIN))
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.text.startswith("month,admissions,readmission_rate")


def test_treatments_are_ranked_by_recovery(client: TestClient, auth_header) -> None:
    """The best recovering treatment is listed first."""
    rows = client.get("/api/v1/treatment", headers=auth_header(Role.HOSPITAL_ADMIN)).json()
    scores = [row["average_recovery_score"] for row in rows]
    assert scores == sorted(scores, reverse=True)
