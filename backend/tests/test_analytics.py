"""Tests for hospital, outcome and population analytics: repository
aggregates, service business logic (including doctor scoping and the
population-health cohort guard), and the API endpoints.
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.rbac import Role
from app.core.security import create_access_token
from app.models.admission import Admission
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.models.user import User
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.risk_prediction_repository import RiskPredictionRepository
from app.services.analytics_service import AnalyticsService, CohortTooSmallError


def admin(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


def _make_patient(db_session: Session, mrn: str, **overrides) -> Patient:
    patient = Patient(medical_record_number=mrn, **overrides)
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


def _make_admission(db_session: Session, patient_id: int, **overrides) -> Admission:
    admission = Admission(patient_id=patient_id, **overrides)
    db_session.add(admission)
    db_session.commit()
    db_session.refresh(admission)
    return admission


def _make_doctor(db_session: Session, email: str) -> User:
    user = User(
        email=email,
        full_name="Analytics Doctor",
        hashed_password="not-a-real-hash",
        role=str(Role.DOCTOR),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _doctor_header(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id), str(Role.DOCTOR))}"}


def _make_prediction(db_session: Session, patient_id: int, risk_category: str) -> RiskPrediction:
    prediction = RiskPrediction(
        patient_id=patient_id,
        readmission_probability=0.5,
        risk_category=risk_category,
        prediction_type="risk",
        model_name="risk",
        model_version="v1",
    )
    db_session.add(prediction)
    db_session.commit()
    return prediction


# --------------------------------------------------------------------------
# AnalyticsRepository
# --------------------------------------------------------------------------


def test_admission_stats_computes_distinct_patients_and_average_stay(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-ANL-1")
    _make_admission(db_session, patient.id, time_in_hospital=4)
    _make_admission(db_session, patient.id, time_in_hospital=8)

    patients, admissions, average_stay = AnalyticsRepository(db_session).admission_stats()
    assert (patients, admissions) == (1, 2)
    assert average_stay == pytest.approx(6.0)


def test_admission_stats_is_scoped_to_a_doctor(db_session: Session) -> None:
    doctor = _make_doctor(db_session, "scope.analytics@hospital.org")
    mine = _make_patient(db_session, "MRN-ANL-2", assigned_doctor_id=doctor.id)
    other = _make_patient(db_session, "MRN-ANL-3")
    _make_admission(db_session, mine.id)
    _make_admission(db_session, other.id)

    patients, admissions, _ = AnalyticsRepository(db_session).admission_stats(doctor_id=doctor.id)
    assert (patients, admissions) == (1, 1)


def test_readmission_rate_excludes_no_labels(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-ANL-4")
    _make_admission(db_session, patient.id, readmitted="<30")
    _make_admission(db_session, patient.id, readmitted="NO")

    rate = AnalyticsRepository(db_session).readmission_rate()
    assert rate == pytest.approx(0.5)


def test_readmission_trend_buckets_by_month(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-ANL-5")
    _make_admission(db_session, patient.id, admission_date=date(2026, 1, 10), readmitted="<30")
    _make_admission(db_session, patient.id, admission_date=date(2026, 1, 20), readmitted="NO")

    trend = AnalyticsRepository(db_session).readmission_trend(months=12)
    assert trend == [{"month": "2026-01", "total_admissions": 2, "readmission_rate": 0.5}]


def test_discharge_outcome_distribution_groups_unknowns(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-ANL-6")
    _make_admission(db_session, patient.id, discharge_disposition="Home")
    _make_admission(db_session, patient.id, discharge_disposition=None)

    distribution = AnalyticsRepository(db_session).discharge_outcome_distribution()
    assert distribution == {"Home": 1, "unknown": 1}


def test_demographic_distribution_counts_every_dimension(db_session: Session) -> None:
    _make_patient(db_session, "MRN-ANL-7", age_group="60-69", gender="Female", race="Asian")
    _make_patient(db_session, "MRN-ANL-8", age_group="60-69", gender="Male", race="Asian")

    distribution = AnalyticsRepository(db_session).demographic_distribution()
    assert distribution["age_group"] == {"60-69": 2}
    assert distribution["gender"] == {"Female": 1, "Male": 1}


def test_disease_prevalence_orders_by_frequency(db_session: Session) -> None:
    _make_patient(db_session, "MRN-ANL-9", primary_diagnosis="Cardiac failure")
    _make_patient(db_session, "MRN-ANL-10", primary_diagnosis="Cardiac failure")
    _make_patient(db_session, "MRN-ANL-11", primary_diagnosis="Diabetes")

    prevalence = AnalyticsRepository(db_session).disease_prevalence(limit=10)
    assert prevalence[0] == ("Cardiac failure", 2)


# --------------------------------------------------------------------------
# RiskPredictionRepository.risk_category_distribution
# --------------------------------------------------------------------------


def test_risk_category_distribution_counts_latest_prediction_only(db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-ANL-12")
    _make_prediction(db_session, patient.id, "low")
    _make_prediction(db_session, patient.id, "high")  # supersedes the "low" one above

    distribution = RiskPredictionRepository(db_session).risk_category_distribution()
    assert distribution == {"low": 0, "medium": 0, "high": 1}


# --------------------------------------------------------------------------
# AnalyticsService
# --------------------------------------------------------------------------


def test_population_health_raises_below_the_configured_minimum(db_session: Session) -> None:
    _make_patient(db_session, "MRN-ANL-13")  # only 1 patient
    researcher = CurrentUser(subject="1", role=Role.RESEARCHER)
    with pytest.raises(CohortTooSmallError):
        AnalyticsService(db_session).population_health(researcher, min_cohort_size=10)


def test_population_health_succeeds_at_the_minimum(db_session: Session) -> None:
    for i in range(5):
        _make_patient(db_session, f"MRN-ANL-POP-{i}")
    researcher = CurrentUser(subject="1", role=Role.RESEARCHER)
    result = AnalyticsService(db_session).population_health(researcher, min_cohort_size=5)
    assert result["total_patients"] == 5


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------


def test_hospital_summary_endpoint_is_forbidden_for_a_doctor(
    client: TestClient, db_session: Session
) -> None:
    """Known RBAC gap, not introduced here: the SRS access matrix describes
    "Doctor: Limited" access to the Hospital Analytics Dashboard, but
    app/core/rbac.py's actual PERMISSIONS grant doctors no
    HOSPITAL_ANALYTICS_READ variant at all (unlike TREATMENT_REPORT_READ,
    which has a documented _LIMITED counterpart doctors do hold). Widening
    that grant is an RBAC policy decision, not a Milestone 3 analytics one -
    this test pins the current, real behaviour rather than the aspirational
    SRS wording. AnalyticsRepository.admission_stats' doctor-scoping is
    verified independently in test_admission_stats_is_scoped_to_a_doctor.
    """
    doctor = _make_doctor(db_session, "summary.doctor@hospital.org")
    response = client.get("/api/v1/analytics/summary", headers=_doctor_header(doctor))
    assert response.status_code == 403


def test_hospital_summary_endpoint_full_access_for_hospital_admin(
    client: TestClient, auth_header, db_session: Session
) -> None:
    _make_patient(db_session, "MRN-ANL-EP-3")
    _make_patient(db_session, "MRN-ANL-EP-4")

    response = client.get("/api/v1/analytics/summary", headers=auth_header(Role.HOSPITAL_ADMIN))
    assert response.status_code == 200
    assert response.json()["total_patients"] == 2


def test_readmission_analytics_endpoint(
    client: TestClient, auth_header, db_session: Session
) -> None:
    patient = _make_patient(db_session, "MRN-ANL-EP-5")
    _make_admission(db_session, patient.id, admission_date=date(2026, 3, 1), readmitted="<30")

    response = client.get("/api/v1/analytics/readmissions", headers=admin(auth_header))
    assert response.status_code == 200
    assert response.json()[0]["month"] == "2026-03"


def test_discharge_outcomes_endpoint(client: TestClient, auth_header, db_session: Session) -> None:
    patient = _make_patient(db_session, "MRN-ANL-EP-6")
    _make_admission(db_session, patient.id, discharge_disposition="Home")

    response = client.get("/api/v1/analytics/discharge-outcomes", headers=admin(auth_header))
    assert response.status_code == 200
    assert response.json()["distribution"]["Home"] == 1


def test_population_health_endpoint_returns_422_for_a_small_hospital(
    client: TestClient, auth_header, db_session: Session
) -> None:
    _make_patient(db_session, "MRN-ANL-EP-7")  # 1 patient, below the default minimum of 10

    response = client.get("/api/v1/analytics/population-health", headers=admin(auth_header))
    assert response.status_code == 422
    assert response.json()["detail"]["error"] == "cohort_too_small"


def test_population_health_endpoint_requires_permission(client: TestClient, auth_header) -> None:
    """Doctor lacks POPULATION_HEALTH_READ."""
    response = client.get("/api/v1/analytics/population-health", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 403


def test_analytics_endpoints_require_authentication(client: TestClient) -> None:
    for path in ("/api/v1/analytics/summary", "/api/v1/analytics/readmissions"):
        assert client.get(path).status_code == 401


# --------------------------------------------------------------------------
# Department analytics
# --------------------------------------------------------------------------


def _seed_departments(db_session: Session) -> None:
    first = _make_patient(db_session, "MRN-ANL-DEP-1")
    second = _make_patient(db_session, "MRN-ANL-DEP-2")
    _make_admission(
        db_session,
        first.id,
        department="Cardiology",
        admission_date=date(2026, 1, 5),
        time_in_hospital=4,
        readmitted="<30",
    )
    _make_admission(
        db_session,
        second.id,
        department="Cardiology",
        admission_date=date(2026, 2, 5),
        time_in_hospital=6,
        readmitted="NO",
    )
    _make_admission(db_session, first.id, admission_date=date(2026, 3, 5), readmitted="NO")


def test_department_stats_groups_and_labels_unassigned(db_session: Session) -> None:
    _seed_departments(db_session)
    rows = {row["department"]: row for row in AnalyticsRepository(db_session).department_stats()}
    assert rows["Cardiology"] == {
        "department": "Cardiology",
        "total_patients": 2,
        "total_admissions": 2,
        "average_length_of_stay": pytest.approx(5.0),
        "readmission_rate": pytest.approx(0.5),
    }
    assert rows["unassigned"]["total_admissions"] == 1


def test_departments_endpoint_applies_the_date_window(
    client: TestClient, auth_header, db_session: Session
) -> None:
    _seed_departments(db_session)
    response = client.get(
        "/api/v1/analytics/departments?date_from=2026-02-01&date_to=2026-02-28",
        headers=auth_header(Role.HOSPITAL_ADMIN),
    )
    assert response.status_code == 200
    assert [(row["department"], row["total_admissions"]) for row in response.json()] == [
        ("Cardiology", 1)
    ]


def test_departments_endpoint_sorts(client: TestClient, auth_header, db_session: Session) -> None:
    _seed_departments(db_session)
    response = client.get(
        "/api/v1/analytics/departments?sort_by=total_admissions&order=desc",
        headers=admin(auth_header),
    )
    assert [row["department"] for row in response.json()] == ["Cardiology", "unassigned"]


def test_departments_endpoint_rejects_an_inverted_date_range(
    client: TestClient, auth_header
) -> None:
    response = client.get(
        "/api/v1/analytics/departments?date_from=2026-03-01&date_to=2026-01-01",
        headers=admin(auth_header),
    )
    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["loc"] == ["query", "date_from"]
    assert "date_from must be on or before date_to" in error["msg"]


@pytest.mark.parametrize(
    "query",
    ["sort_by=patient_name", "order=sideways", "date_from=not-a-date"],
)
def test_departments_endpoint_validates_sort_and_filters(
    client: TestClient, auth_header, query: str
) -> None:
    response = client.get(f"/api/v1/analytics/departments?{query}", headers=admin(auth_header))
    assert response.status_code == 422


# --------------------------------------------------------------------------
# Trends
# --------------------------------------------------------------------------


def test_outcome_trend_breaks_down_by_discharge_month(
    client: TestClient, auth_header, db_session: Session
) -> None:
    from app.models.treatment import TreatmentOutcome

    patient = _make_patient(db_session, "MRN-ANL-TR-1")
    admission = _make_admission(db_session, patient.id, discharge_date=date(2026, 4, 10))
    for outcome in ("improved", "improved", None):
        db_session.add(
            TreatmentOutcome(admission_id=admission.id, treatment_name="Insulin", outcome=outcome)
        )
    db_session.commit()

    response = client.get("/api/v1/analytics/trends?metric=outcome", headers=admin(auth_header))
    assert response.status_code == 200
    assert response.json() == [
        {"period": "2026-04", "total": 3, "breakdown": {"improved": 2, "unrecorded": 1}}
    ]


def test_risk_trend_counts_scores_per_month(
    client: TestClient, auth_header, db_session: Session
) -> None:
    patient = _make_patient(db_session, "MRN-ANL-TR-2")
    _make_prediction(db_session, patient.id, "low")
    _make_prediction(db_session, patient.id, "high")

    response = client.get("/api/v1/analytics/trends?metric=risk", headers=admin(auth_header))
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["total"] == 2
    assert body[0]["breakdown"] == {"low": 1, "medium": 0, "high": 1}


@pytest.mark.parametrize(
    "query", ["", "metric=readmission", "metric=risk&months=0", "metric=risk&months=61"]
)
def test_trends_endpoint_validates_its_parameters(
    client: TestClient, auth_header, query: str
) -> None:
    response = client.get(f"/api/v1/analytics/trends?{query}", headers=admin(auth_header))
    assert response.status_code == 422


# --------------------------------------------------------------------------
# RBAC for the dashboard endpoints
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/analytics/departments",
        "/api/v1/analytics/trends?metric=risk",
        "/api/v1/analytics/discharge-outcomes",
    ],
)
def test_new_dashboard_endpoints_pin_the_doctor_rbac_gap(
    client: TestClient, auth_header, path: str
) -> None:
    """Same documented gap as test_hospital_summary_endpoint_is_forbidden_for_a_doctor."""
    assert client.get(path, headers=auth_header(Role.DOCTOR)).status_code == 403


@pytest.mark.parametrize("role", [Role.HOSPITAL_ADMIN, Role.RESEARCHER, Role.SYSTEM_ADMIN])
def test_new_dashboard_endpoints_allow_hospital_analytics_roles(
    client: TestClient, auth_header, role: Role
) -> None:
    for path in ("/api/v1/analytics/departments", "/api/v1/analytics/trends?metric=outcome"):
        assert client.get(path, headers=auth_header(role)).status_code == 200


def test_population_health_is_available_to_a_hospital_admin(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """SRS section 9: "Population Health Reports - Hospital Administrator: Yes"."""
    for i in range(10):
        _make_patient(db_session, f"MRN-ANL-HA-{i}")
    response = client.get(
        "/api/v1/analytics/population-health", headers=auth_header(Role.HOSPITAL_ADMIN)
    )
    assert response.status_code == 200
    assert response.json()["total_patients"] == 10
