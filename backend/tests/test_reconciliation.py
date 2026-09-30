"""Analytics reconciliation tests - Milestone 4.

Every dashboard number is computed by a different query. If two of them describe
the same population they must agree, or a reader is shown a hospital that
disagrees with itself. These tests build one known cohort and check that every
report that can be added up, does.
"""

import csv
import io

import pytest

from app.core.rbac import Role
from app.models.prediction import RiskPrediction


@pytest.fixture
def cohort(db, make_cohort, make_user):
    """Three departments with known sizes and readmission counts."""
    ids = []
    ids += make_cohort(300, 30, department="Cardiology", age_group="60-70")
    ids += make_cohort(200, 30, department="Surgery", age_group="70-80")
    ids += make_cohort(100, 5, department="Radiology", age_group="50-60")
    db.add_all(
        RiskPrediction(
            patient_id=pid,
            readmission_probability=0.1,
            risk_category="medium",
            model_name="t",
            model_version="1",
        )
        for pid in ids
    )
    db.commit()
    return make_user(Role.HOSPITAL_ADMIN), {"admissions": 600, "readmitted": 65}


def test_the_summary_matches_the_cohort_we_built(client, cohort, auth_header) -> None:
    admin, truth = cohort
    summary = client.get("/api/v1/analytics/summary", headers=auth_header(admin)).json()

    assert summary["total_admissions"] == truth["admissions"]
    assert summary["readmissions_within_30_days"] == truth["readmitted"]
    assert summary["readmission_rate"] == pytest.approx(65 / 600, abs=1e-4)


def test_performance_rows_add_up_to_the_hospital_total(client, cohort, auth_header) -> None:
    admin, truth = cohort
    report = client.get(
        "/api/v1/analytics/performance?dimension=department", headers=auth_header(admin)
    ).json()

    assert sum(r["admissions"] for r in report["rows"]) == truth["admissions"]
    assert report["overall"]["readmissions"] == truth["readmitted"]
    readmitted = sum(r.get("readmissions", 0) for r in report["rows"] if not r["suppressed"])
    assert readmitted == truth["readmitted"]


def test_expected_readmissions_are_the_sum_of_the_predictions(client, cohort, auth_header) -> None:
    admin, truth = cohort
    overall = client.get("/api/v1/analytics/performance", headers=auth_header(admin)).json()[
        "overall"
    ]["observed_vs_expected"]
    assert overall["expected"] == pytest.approx(0.1 * truth["admissions"])
    assert overall["observed"] == truth["readmitted"]


def test_the_trend_chart_covers_every_admission_exactly_once(client, cohort, auth_header) -> None:
    admin, truth = cohort
    trend = client.get("/api/v1/analytics/trends?buckets=6", headers=auth_header(admin)).json()

    assert sum(p["n"] for p in trend["points"]) == truth["admissions"]
    weighted = sum(p["rate"] * p["n"] for p in trend["points"])
    assert weighted == pytest.approx(truth["readmitted"], abs=len(trend["points"]))
    assert trend["centre_line"] == pytest.approx(65 / 600, abs=1e-4)


def test_the_age_breakdown_adds_up(client, cohort, auth_header) -> None:
    admin, truth = cohort
    bands = client.get("/api/v1/analytics/readmissions/by-age", headers=auth_header(admin)).json()
    assert sum(b["admissions"] for b in bands) == truth["admissions"]
    assert sum(b["readmissions"] for b in bands) == truth["readmitted"]


def test_the_calibration_bands_cover_every_scored_patient(client, cohort, auth_header) -> None:
    admin, truth = cohort
    bands = client.get("/api/v1/risk/calibration", headers=auth_header(admin)).json()["bands"]
    assert sum(b["patients"] for b in bands) == truth["admissions"]
    assert sum(b["observed_readmissions"] for b in bands) == truth["readmitted"]


def test_the_recovery_report_agrees_with_the_summary(client, cohort, auth_header) -> None:
    admin, truth = cohort
    recovery = client.get("/api/v1/treatment/recovery", headers=auth_header(admin)).json()
    overall = recovery["overall"]

    assert overall["n"] == truth["admissions"]
    assert overall["no_readmission_rate"] == pytest.approx(
        1 - truth["readmitted"] / truth["admissions"], abs=1e-3
    )


def test_every_dimension_in_the_export_adds_up_to_the_hospital_total(
    client, cohort, auth_header
) -> None:
    """Each cut of the same population must total the same admissions."""
    admin, truth = cohort
    body = client.get("/api/v1/reports/hospital-performance", headers=auth_header(admin)).text
    lines = [line for line in body.splitlines() if not line.startswith("#")]

    totals: dict[str, int] = {}
    for row in csv.DictReader(io.StringIO(chr(10).join(lines))):
        totals[row["dimension"]] = totals.get(row["dimension"], 0) + int(row["admissions"])

    assert len(totals) >= 2, "the export should hold more than one dimension"
    assert set(totals.values()) == {truth["admissions"]}
