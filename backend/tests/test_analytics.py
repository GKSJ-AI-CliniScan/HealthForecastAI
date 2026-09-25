"""Tests for Patient Outcome & Hospital Analytics endpoints."""

from fastapi.testclient import TestClient


def test_get_outcomes(client: TestClient) -> None:
    response = client.get("/api/v1/analytics/outcomes")
    assert response.status_code == 200
    data = response.json()
    assert "readmission_rate_pct" in data
    assert "total_patients" in data


def test_get_hospital_performance(client: TestClient) -> None:
    response = client.get("/api/v1/analytics/hospital-performance")
    assert response.status_code == 200
    data = response.json()
    assert "overall_readmission_rate" in data
    assert len(data["departments"]) > 0


def test_get_department_performance(client: TestClient) -> None:
    response = client.get("/api/v1/analytics/departments")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert data[0]["department"] == "Cardiology"


def test_get_treatment_effectiveness(client: TestClient) -> None:
    response = client.get("/api/v1/analytics/treatments/effectiveness")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "success_rate_pct" in data[0]


def test_generate_report(client: TestClient) -> None:
    payload = {
        "title": "Monthly Hospital Performance",
        "start_date": "2026-08-01",
        "end_date": "2026-08-31",
        "include_treatments": True,
        "export_format": "json",
    }
    response = client.post("/api/v1/analytics/reports/generate", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "report_id" in data
    assert "summary_metrics" in data