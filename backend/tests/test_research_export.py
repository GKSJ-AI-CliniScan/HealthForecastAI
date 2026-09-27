"""Tests for the research anonymisation utilities and the /patients/anonymised
endpoint, including the re-identification-risk cohort-size guard.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rbac import Role
from app.models.patient import Patient
from app.services.patient_service import CohortTooSmallError, PatientService
from app.utils.anonymisation import anonymise_patient, generalise_age, pseudonymise


def admin(auth_header) -> dict[str, str]:
    return auth_header(Role.SYSTEM_ADMIN)


def _make_patient(db_session: Session, mrn: str, **overrides) -> Patient:
    patient = Patient(medical_record_number=mrn, **overrides)
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


# --------------------------------------------------------------------------
# pseudonymise / generalise_age / anonymise_patient
# --------------------------------------------------------------------------


def test_pseudonymise_is_deterministic_for_the_same_salt() -> None:
    assert pseudonymise("42", "salt-a") == pseudonymise("42", "salt-a")


def test_pseudonymise_differs_across_salts() -> None:
    assert pseudonymise("42", "salt-a") != pseudonymise("42", "salt-b")


def test_pseudonymise_never_contains_the_raw_identifier() -> None:
    assert "42" not in pseudonymise("42", "salt-a")


def test_generalise_age_buckets_a_raw_numeric_age() -> None:
    assert generalise_age("61") == "60-69"
    assert generalise_age("0") == "0-9"


def test_generalise_age_passes_through_an_already_banded_value() -> None:
    """The Diabetes 130-US profile stores age_group as a band already."""
    assert generalise_age("[70-80)") == "[70-80)"


def test_generalise_age_handles_none() -> None:
    assert generalise_age(None) is None


def test_anonymise_patient_drops_the_medical_record_number(db_session: Session) -> None:
    patient = _make_patient(
        db_session, "MRN-SECRET-1", age_group="61", gender="Female", primary_diagnosis="Cardiac"
    )
    result = anonymise_patient(patient, salt="test-salt")

    assert "medical_record_number" not in result
    assert "MRN-SECRET-1" not in str(result.values())
    assert result["age_group"] == "60-69"
    assert result["pseudo_id"].startswith("PT-")


# --------------------------------------------------------------------------
# PatientService.list_for_research
# --------------------------------------------------------------------------


def test_list_for_research_raises_below_the_minimum(db_session: Session) -> None:
    _make_patient(db_session, "MRN-RES-1")
    from app.api.deps import CurrentUser

    researcher = CurrentUser(subject="1", role=Role.RESEARCHER)
    with pytest.raises(CohortTooSmallError) as exc_info:
        PatientService(db_session).list_for_research(researcher, min_cohort_size=10)
    assert exc_info.value.size == 1
    assert exc_info.value.minimum == 10


def test_list_for_research_succeeds_at_the_minimum(db_session: Session) -> None:
    for i in range(5):
        _make_patient(db_session, f"MRN-RES-MIN-{i}")
    from app.api.deps import CurrentUser

    researcher = CurrentUser(subject="1", role=Role.RESEARCHER)
    rows = PatientService(db_session).list_for_research(researcher, min_cohort_size=5)
    assert len(rows) == 5


# --------------------------------------------------------------------------
# GET /patients/anonymised
# --------------------------------------------------------------------------


def test_anonymised_endpoint_never_exposes_the_medical_record_number(
    client: TestClient, auth_header
) -> None:
    for i in range(10):
        client.post(
            "/api/v1/patients",
            headers=admin(auth_header),
            json={"medical_record_number": f"MRN-ENDPOINT-{i}", "age_group": "61"},
        )

    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 10
    for entry in body:
        assert set(entry) == {"pseudo_id", "age_group", "gender", "primary_diagnosis"}
        assert entry["age_group"] == "60-69"


def test_anonymised_endpoint_returns_422_for_a_small_hospital(
    client: TestClient, auth_header
) -> None:
    client.post(
        "/api/v1/patients",
        headers=admin(auth_header),
        json={"medical_record_number": "MRN-SMALL-1"},
    )

    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.RESEARCHER))
    assert response.status_code == 422
    body = response.json()["detail"]
    assert body == {"error": "cohort_too_small", "minimum": 10, "actual": 1}


def test_anonymised_endpoint_is_forbidden_for_a_doctor(client: TestClient, auth_header) -> None:
    response = client.get("/api/v1/patients/anonymised", headers=auth_header(Role.DOCTOR))
    assert response.status_code == 403


# --------------------------------------------------------------------------
# Cohort filtering, pagination and guard bypass attempts
# --------------------------------------------------------------------------


def _seed_cohort(db_session: Session) -> None:
    """12 cardiac patients aged 61 (band 60-69), 3 diabetic patients aged 35."""
    from datetime import date

    from app.models.admission import Admission

    for i in range(12):
        patient = _make_patient(
            db_session,
            f"MRN-COH-C-{i}",
            age_group="61",
            gender="Female" if i % 2 else "Male",
            primary_diagnosis="Cardiac failure",
        )
        db_session.add(Admission(patient_id=patient.id, admission_date=date(2026, 1, 10)))
    for i in range(3):
        patient = _make_patient(
            db_session, f"MRN-COH-D-{i}", age_group="35", primary_diagnosis="Diabetes"
        )
        db_session.add(Admission(patient_id=patient.id, admission_date=date(2025, 6, 1)))
    db_session.commit()


def researcher(auth_header) -> dict[str, str]:
    return auth_header(Role.RESEARCHER)


def test_anonymised_endpoint_paginates_and_reports_the_filtered_total(
    client: TestClient, auth_header, db_session: Session
) -> None:
    _seed_cohort(db_session)
    first = client.get("/api/v1/patients/anonymised?limit=5", headers=researcher(auth_header))
    second = client.get(
        "/api/v1/patients/anonymised?limit=5&offset=5", headers=researcher(auth_header)
    )
    assert first.status_code == 200
    assert first.headers["X-Total-Count"] == "15"
    assert len(first.json()) == 5
    first_ids = {row["pseudo_id"] for row in first.json()}
    assert first_ids.isdisjoint({row["pseudo_id"] for row in second.json()})


def test_anonymised_endpoint_filters_by_diagnosis_case_insensitively(
    client: TestClient, auth_header, db_session: Session
) -> None:
    _seed_cohort(db_session)
    response = client.get(
        "/api/v1/patients/anonymised?diagnosis=cardiac%20FAILURE", headers=researcher(auth_header)
    )
    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "12"
    assert {row["primary_diagnosis"] for row in response.json()} == {"Cardiac failure"}


def test_filters_cannot_isolate_a_cohort_below_the_minimum(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """15 patients hospital-wide pass the guard; the 3-patient Diabetes subset
    must not, whatever page size is requested."""
    _seed_cohort(db_session)
    for path in (
        "/api/v1/patients/anonymised?diagnosis=Diabetes",
        "/api/v1/patients/anonymised?diagnosis=Diabetes&limit=1",
        "/api/v1/patients/anonymised?age_band=30-39",
        "/api/v1/patients/anonymised?date_to=2025-12-31",
        "/api/v1/analytics/research-cohort?diagnosis=Diabetes",
        "/api/v1/analytics/research-export?diagnosis=Diabetes",
    ):
        response = client.get(path, headers=researcher(auth_header))
        assert response.status_code == 422, path
        assert response.json()["detail"] == {
            "error": "cohort_too_small",
            "minimum": 10,
            "actual": 3,
        }


def test_age_band_filter_matches_the_generalised_band(
    client: TestClient, auth_header, db_session: Session
) -> None:
    _seed_cohort(db_session)
    response = client.get(
        "/api/v1/patients/anonymised?age_band=60-69", headers=researcher(auth_header)
    )
    assert response.headers["X-Total-Count"] == "12"


def test_raw_age_is_not_a_usable_age_band(
    client: TestClient, auth_header, db_session: Session
) -> None:
    """Filtering on a raw stored age must not match: only generalised bands do."""
    _seed_cohort(db_session)
    response = client.get(
        "/api/v1/patients/anonymised?age_band=61", headers=researcher(auth_header)
    )
    assert response.status_code == 422
    assert response.json()["detail"]["actual"] == 0


@pytest.mark.parametrize(
    "query",
    [
        "date_from=2026-02-01&date_to=2026-01-01",
        "diagnosis=",
        "gender=" + "x" * 17,
        "limit=0",
        "limit=1001",
        "offset=-1",
    ],
)
def test_anonymised_endpoint_validates_filters(client: TestClient, auth_header, query: str) -> None:
    response = client.get(f"/api/v1/patients/anonymised?{query}", headers=researcher(auth_header))
    assert response.status_code == 422


# --------------------------------------------------------------------------
# GET /analytics/research-cohort
# --------------------------------------------------------------------------


def test_research_cohort_statistics_use_generalised_values(
    client: TestClient, auth_header, db_session: Session
) -> None:
    _seed_cohort(db_session)
    response = client.get(
        "/api/v1/analytics/research-cohort?diagnosis=Cardiac%20failure",
        headers=researcher(auth_header),
    )
    assert response.status_code == 200
    assert response.json() == {
        "cohort_size": 12,
        "age_band_distribution": {"60-69": 12},
        "gender_distribution": {"Male": 6, "Female": 6},
        "diagnosis_distribution": {"Cardiac failure": 12},
    }


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (Role.DOCTOR, 403),
        (Role.HOSPITAL_ADMIN, 200),
        (Role.RESEARCHER, 200),
        (Role.SYSTEM_ADMIN, 200),
    ],
)
def test_research_cohort_follows_population_health_permission(
    client: TestClient, auth_header, db_session: Session, role: Role, expected: int
) -> None:
    _seed_cohort(db_session)
    response = client.get("/api/v1/analytics/research-cohort", headers=auth_header(role))
    assert response.status_code == expected


# --------------------------------------------------------------------------
# GET /analytics/research-export
# --------------------------------------------------------------------------


def test_research_export_returns_anonymised_csv(
    client: TestClient, auth_header, db_session: Session
) -> None:
    _seed_cohort(db_session)
    response = client.get(
        "/api/v1/analytics/research-export?diagnosis=Cardiac%20failure",
        headers=researcher(auth_header),
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]

    lines = response.text.strip().splitlines()
    assert lines[0] == "pseudo_id,age_group,gender,primary_diagnosis"
    assert len(lines) == 13
    assert "MRN-COH" not in response.text
    assert all(line.startswith("PT-") for line in lines[1:])
    assert all(",60-69," in line for line in lines[1:])


@pytest.mark.parametrize(
    ("role", "expected"),
    [
        (Role.DOCTOR, 403),
        (Role.HOSPITAL_ADMIN, 403),  # SRS section 9: Research Dataset Export - No
        (Role.RESEARCHER, 200),
        (Role.SYSTEM_ADMIN, 200),
    ],
)
def test_research_export_follows_the_access_matrix(
    client: TestClient, auth_header, db_session: Session, role: Role, expected: int
) -> None:
    _seed_cohort(db_session)
    response = client.get("/api/v1/analytics/research-export", headers=auth_header(role))
    assert response.status_code == expected


def test_research_export_is_audit_logged_with_its_filters(
    client: TestClient, auth_header, db_session: Session
) -> None:
    from sqlalchemy import select

    from app.models.audit_log import AuditLog

    _seed_cohort(db_session)
    client.get(
        "/api/v1/analytics/research-export?diagnosis=Cardiac%20failure",
        headers=researcher(auth_header),
    )
    entry = db_session.execute(
        select(AuditLog).where(AuditLog.action == "patient.research_export")
    ).scalar_one()
    assert entry.resource == "cohort_size:12;filters:diagnosis=Cardiac failure"


def test_research_export_requires_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/analytics/research-export").status_code == 401


# --------------------------------------------------------------------------
# Hardening units
# --------------------------------------------------------------------------


def test_research_csv_neutralises_spreadsheet_formulas() -> None:
    from app.utils.anonymisation import research_csv

    body = research_csv(
        [
            {
                "pseudo_id": "PT-1",
                "age_group": None,
                "gender": "@SUM(A1)",
                "primary_diagnosis": "=HYPERLINK(1)",
            }
        ]
    )
    assert body.splitlines()[1] == "PT-1,,'@SUM(A1),'=HYPERLINK(1)"


def test_research_audit_resource_fits_the_audit_column() -> None:
    from app.schemas.analytics import ResearchCohortFilter
    from app.services.patient_service import research_audit_resource

    resource = research_audit_resource(10, ResearchCohortFilter(diagnosis="x" * 255))
    assert len(resource) == 128


def test_production_refuses_the_placeholder_anonymisation_salt() -> None:
    from pydantic import ValidationError

    from app.core.config import PLACEHOLDER_ANONYMISATION_SALT, Settings

    with pytest.raises(ValidationError, match="ANONYMISATION_SALT"):
        Settings(ENVIRONMENT="production", ANONYMISATION_SALT=PLACEHOLDER_ANONYMISATION_SALT)
    assert Settings(ENVIRONMENT="production", ANONYMISATION_SALT="a-real-secret")


def test_minimum_cohort_size_cannot_be_configured_to_zero() -> None:
    from pydantic import ValidationError

    from app.core.config import Settings

    with pytest.raises(ValidationError):
        Settings(RESEARCH_MIN_COHORT_SIZE=0)
