"""Hospital performance and trend monitoring tests - Milestone 3."""

import pytest

from app.core.rbac import Role
from app.models.prediction import RiskPrediction


def score(db, patient_ids: list[int], probability: float) -> None:
    """Give every listed patient the same predicted risk."""
    db.add_all(
        RiskPrediction(
            patient_id=pid,
            readmission_probability=probability,
            risk_category="medium",
            model_name="test",
            model_version="1",
        )
        for pid in patient_ids
    )
    db.commit()


def row(report: dict, group: str) -> dict:
    return next(r for r in report["rows"] if r["group"] == group)


def test_observed_to_expected_uses_the_models_predictions(
    client, db, make_cohort, make_user, auth_header
) -> None:
    """Expected is the sum of predicted probabilities - here 10% of 400 = 40."""
    ids = make_cohort(400, 60, department="Cardiology")
    score(db, ids, 0.10)

    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get(
        "/api/v1/analytics/performance?dimension=department", headers=auth_header(admin)
    ).json()

    oe = row(report, "Cardiology")["observed_vs_expected"]
    assert oe["observed"] == 60
    assert oe["expected"] == pytest.approx(40.0)
    assert oe["ratio"] == pytest.approx(1.5)
    assert oe["verdict"] == "worse than expected", "60 against 40 is well outside chance"


def test_a_difference_within_chance_is_not_called_out(
    client, db, make_cohort, make_user, auth_header
) -> None:
    """Six readmissions against four expected is not evidence of anything."""
    ids = make_cohort(40, 6, department="Radiology")
    score(db, ids, 0.10)

    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get(
        "/api/v1/analytics/performance?dimension=department", headers=auth_header(admin)
    ).json()

    oe = row(report, "Radiology")["observed_vs_expected"]
    assert oe["ratio"] == pytest.approx(1.5)
    assert oe["verdict"] == "as expected", "a 1.5 ratio on four expected events is noise"


def test_better_than_expected_is_reported_too(
    client, db, make_cohort, make_user, auth_header
) -> None:
    ids = make_cohort(600, 30, department="Surgery")
    score(db, ids, 0.10)

    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get(
        "/api/v1/analytics/performance?dimension=department", headers=auth_header(admin)
    ).json()
    assert row(report, "Surgery")["observed_vs_expected"]["verdict"] == "better than expected"


def test_a_missing_department_is_reported_as_not_recorded(
    client, make_cohort, make_user, auth_header
) -> None:
    make_cohort(50, 5, department=None)
    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get(
        "/api/v1/analytics/performance?dimension=department", headers=auth_header(admin)
    ).json()
    assert row(report, "Not recorded")["admissions"] == 50


def test_small_segments_are_suppressed(client, make_cohort, make_user, auth_header) -> None:
    make_cohort(200, 20, department="Medicine")
    make_cohort(4, 1, department="Rare")
    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get(
        "/api/v1/analytics/performance?dimension=department", headers=auth_header(admin)
    ).json()

    assert row(report, "Rare")["suppressed"] is True
    assert "observed_vs_expected" not in row(report, "Rare")


def test_the_report_carries_its_in_sample_caveat(
    client, make_cohort, make_user, auth_header
) -> None:
    make_cohort(50, 5)
    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get("/api/v1/analytics/performance", headers=auth_header(admin)).json()
    assert "fitted on this same population" in report["caveat"]


def test_an_unknown_dimension_is_a_422(client, make_user, auth_header) -> None:
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get(
        "/api/v1/analytics/performance?dimension=salary", headers=auth_header(admin)
    )
    assert response.status_code == 422
    assert "department" in response.json()["detail"]


def test_a_doctor_cannot_see_hospital_performance(client, make_user, auth_header) -> None:
    """Hospital analytics is not a doctor feature in the access matrix."""
    doctor = make_user(Role.DOCTOR)
    assert (
        client.get("/api/v1/analytics/performance", headers=auth_header(doctor)).status_code == 403
    )
    assert client.get("/api/v1/analytics/trends", headers=auth_header(doctor)).status_code == 403


# --------------------------------------------------------------------------
# Trend monitoring
# --------------------------------------------------------------------------


def test_the_trend_splits_the_sequence_into_equal_cohorts(
    client, make_cohort, make_user, auth_header
) -> None:
    make_cohort(1000, 90)
    admin = make_user(Role.HOSPITAL_ADMIN)
    trend = client.get("/api/v1/analytics/trends?buckets=10", headers=auth_header(admin)).json()

    assert len(trend["points"]) == 10
    assert all(point["n"] == 100 for point in trend["points"])
    assert trend["centre_line"] == pytest.approx(0.09)
    assert "not a calendar" in trend["axis_note"], "the axis must be labelled honestly"


def test_a_stable_process_raises_no_signal(client, make_cohort, make_user, auth_header) -> None:
    """Identical cohorts are ordinary variation; nothing should be flagged."""
    for _ in range(10):
        make_cohort(200, 18)
    admin = make_user(Role.HOSPITAL_ADMIN)
    trend = client.get("/api/v1/analytics/trends?buckets=10", headers=auth_header(admin)).json()

    assert trend["signals"] == []
    assert not any(point["out_of_control"] for point in trend["points"])


def test_a_collapse_in_the_newest_cohort_is_flagged(
    client, make_cohort, make_user, auth_header
) -> None:
    """The pattern the monitor found in the real data: the tail falls off a cliff."""
    for _ in range(9):
        make_cohort(200, 20)  # 10% readmitted
    make_cohort(200, 4)  # 2%: far below the limit
    admin = make_user(Role.HOSPITAL_ADMIN)
    trend = client.get("/api/v1/analytics/trends?buckets=10", headers=auth_header(admin)).json()

    last = trend["points"][-1]
    assert last["out_of_control"] is True
    assert last["rate"] < last["lower_limit"]
    assert any(s["cohort"] == 10 and "lower control limit" in s["rule"] for s in trend["signals"])


def test_the_limits_narrow_with_a_bigger_cohort(
    client, make_cohort, make_user, auth_header
) -> None:
    make_cohort(400, 40)
    admin = make_user(Role.HOSPITAL_ADMIN)
    small = client.get("/api/v1/analytics/trends?buckets=20", headers=auth_header(admin)).json()
    large = client.get("/api/v1/analytics/trends?buckets=4", headers=auth_header(admin)).json()

    small_width = small["points"][0]["upper_limit"] - small["points"][0]["lower_limit"]
    large_width = large["points"][0]["upper_limit"] - large["points"][0]["lower_limit"]
    assert small_width > large_width


def test_the_recovery_trend_is_available_to_a_doctor_for_their_caseload(
    client, make_cohort, make_user, auth_header
) -> None:
    doctor = make_user(Role.DOCTOR)
    make_cohort(120, 12, doctor_id=doctor.id)
    make_cohort(120, 60, doctor_id=None)

    body = client.get(
        "/api/v1/treatment/recovery-trends?buckets=4", headers=auth_header(doctor)
    ).json()

    assert body["scope"] == "your caseload"
    assert sum(point["n"] for point in body["points"]) == 120, "only the doctor's own patients"
