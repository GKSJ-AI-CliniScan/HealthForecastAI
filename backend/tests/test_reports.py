"""Patient outcome reports and export tests - Milestone 3.

The exports are where privacy either holds or fails, so most of these are about
what must NOT be in the output: identifiers, small groups, formula payloads.
"""

import csv
import io

import pytest

from app.core.rbac import Role
from app.models.audit_log import AuditLog
from app.models.patient import Patient
from app.models.prediction import RiskPrediction
from app.services import reports_service


def parse_csv(text: str) -> tuple[list[str], list[dict[str, str]]]:
    """Parse a CSV that has comment lines above its header."""
    lines = [line for line in text.splitlines() if not line.startswith("#")]
    reader = csv.DictReader(io.StringIO("\n".join(lines)))
    return list(reader.fieldnames or []), list(reader)


# --------------------------------------------------------------------------
# CSV safety
# --------------------------------------------------------------------------


@pytest.mark.parametrize("payload", ["=1+1", "+cmd|' /C calc'!A0", "-2+3", "@SUM(A1)", "\tcmd"])
def test_formula_payloads_are_neutralised(payload: str) -> None:
    """A cell that starts like a formula must not run when opened in a spreadsheet."""
    assert reports_service.safe_cell(payload) == "'" + payload


def test_ordinary_values_are_untouched() -> None:
    assert reports_service.safe_cell("Circulatory") == "Circulatory"
    assert reports_service.safe_cell(">8") == ">8"
    assert reports_service.safe_cell(42) == 42
    assert reports_service.safe_cell(None) is None


def test_the_csv_writer_applies_the_guard() -> None:
    body = reports_service.to_csv(["a"], [{"a": "=HYPERLINK(evil)"}, {"a": "fine"}])
    _, rows = parse_csv(body)
    assert rows[0]["a"].startswith("'=")
    assert rows[1]["a"] == "fine"


# --------------------------------------------------------------------------
# Patient outcome report
# --------------------------------------------------------------------------


@pytest.fixture
def reportable(db, make_user, make_patient, make_admission, make_treatment):
    doctor = make_user(Role.DOCTOR)
    patient = make_patient(assigned_doctor_id=doctor.id, primary_diagnosis="Diabetes")
    admission = make_admission(patient.id, readmitted="<30", num_medications=18, a1c_result=">8")
    make_treatment(admission.id, "insulin", "Up")
    make_treatment(admission.id, "metformin", "Steady")
    db.add(
        RiskPrediction(
            patient_id=patient.id,
            readmission_probability=0.31,
            risk_category="high",
            model_name="m",
            model_version="1",
            drivers={"baseline_probability": 0.09, "exact": True, "up": [], "down": []},
        )
    )
    db.commit()
    return doctor, patient


def test_the_outcome_report_summarises_admissions_and_treatments(
    client, reportable, auth_header
) -> None:
    doctor, patient = reportable
    report = client.get(
        f"/api/v1/reports/patients/{patient.id}/outcome", headers=auth_header(doctor)
    ).json()

    assert report["patient"]["medical_record_number"] == patient.medical_record_number
    assert report["outcome_summary"]["admissions"] == 1
    assert report["outcome_summary"]["readmissions_within_30_days"] == 1
    assert report["outcome_summary"]["treatments_given"] == ["insulin", "metformin"]
    assert report["risk"]["risk_category"] == "high"
    assert report["admissions"][0]["a1c_result"] == ">8"


def test_a_doctor_report_includes_recommendations(client, reportable, auth_header) -> None:
    doctor, patient = reportable
    report = client.get(
        f"/api/v1/reports/patients/{patient.id}/outcome", headers=auth_header(doctor)
    ).json()
    assert report["recommendations"], "clinicians get the recommendations"
    assert "not clinical advice" in report["disclaimer"]


def test_an_administrator_reads_the_report_but_gets_no_recommendations(
    client, reportable, make_user, auth_header
) -> None:
    """The access matrix gives care recommendations to clinicians only."""
    _, patient = reportable
    admin = make_user(Role.HOSPITAL_ADMIN)
    report = client.get(
        f"/api/v1/reports/patients/{patient.id}/outcome", headers=auth_header(admin)
    ).json()
    assert report["outcome_summary"]["admissions"] == 1
    assert report["recommendations"] is None


def test_another_doctors_patient_is_a_404(client, reportable, make_user, auth_header) -> None:
    _, patient = reportable
    other = make_user(Role.DOCTOR)
    response = client.get(
        f"/api/v1/reports/patients/{patient.id}/outcome", headers=auth_header(other)
    )
    assert response.status_code == 404


def test_a_researcher_cannot_read_an_identifiable_report(
    client, reportable, make_user, auth_header
) -> None:
    _, patient = reportable
    researcher = make_user(Role.RESEARCHER)
    response = client.get(
        f"/api/v1/reports/patients/{patient.id}/outcome", headers=auth_header(researcher)
    )
    assert response.status_code == 403


def test_generating_a_report_is_audited(client, db, reportable, auth_header) -> None:
    doctor, patient = reportable
    client.get(f"/api/v1/reports/patients/{patient.id}/outcome", headers=auth_header(doctor))

    entry = db.query(AuditLog).filter(AuditLog.action == "report.patient_outcome").one()
    assert entry.actor_id == doctor.id and entry.resource == f"patient:{patient.id}"


# --------------------------------------------------------------------------
# Hospital performance export
# --------------------------------------------------------------------------


def test_the_performance_export_is_aggregate_only(
    client, make_cohort, make_user, auth_header
) -> None:
    make_cohort(120, 12, department="Cardiology")
    admin = make_user(Role.HOSPITAL_ADMIN)
    response = client.get("/api/v1/reports/hospital-performance", headers=auth_header(admin))

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "MRN" not in response.text, "no patient identifier in an aggregate export"

    columns, rows = parse_csv(response.text)
    assert "observed_to_expected" in columns
    assert any(r["group"] == "Cardiology" for r in rows)


def test_a_doctor_cannot_export_hospital_performance(client, make_user, auth_header) -> None:
    doctor = make_user(Role.DOCTOR)
    assert (
        client.get("/api/v1/reports/hospital-performance", headers=auth_header(doctor)).status_code
        == 403
    )


def test_exports_are_audited(client, db, make_cohort, make_user, auth_header) -> None:
    make_cohort(60, 6)
    admin = make_user(Role.HOSPITAL_ADMIN)
    client.get("/api/v1/reports/hospital-performance", headers=auth_header(admin))

    entry = db.query(AuditLog).filter(AuditLog.action == "export.hospital_performance").one()
    assert entry.actor_id == admin.id and entry.resource.startswith("rows:")


# --------------------------------------------------------------------------
# Research dataset: k-anonymity and de-identification
# --------------------------------------------------------------------------


def test_the_research_dataset_contains_no_direct_identifier(
    client, make_cohort, make_user, auth_header, db
) -> None:
    make_cohort(60, 6)
    researcher = make_user(Role.RESEARCHER)
    response = client.get("/api/v1/reports/research-dataset", headers=auth_header(researcher))

    assert response.status_code == 200
    mrns = [p.medical_record_number for p in db.query(Patient).all()]
    assert not any(mrn in response.text for mrn in mrns), "an MRN leaked into the export"

    columns, rows = parse_csv(response.text)
    for forbidden in ("medical_record_number", "assigned_doctor_id", "id", "patient_id"):
        assert forbidden not in columns
    assert all(row["pseudo_id"].startswith("PT-") for row in rows)


def test_rows_in_small_groups_are_suppressed(client, make_cohort, make_user, auth_header) -> None:
    """k-anonymity: a combination seen fewer than k times could single someone out."""
    make_cohort(40, 4, age_group="60-70", diagnosis="Circulatory")  # a big group: kept
    make_cohort(3, 1, age_group="10-20", diagnosis="Injury")  # only three: suppressed
    researcher = make_user(Role.RESEARCHER)

    response = client.get("/api/v1/reports/research-dataset?k=10", headers=auth_header(researcher))
    _, rows = parse_csv(response.text)

    assert response.headers["x-k-anonymity"] == "10"
    assert int(response.headers["x-suppressed-rows"]) == 3
    assert int(response.headers["x-released-rows"]) == 40
    assert len(rows) == 40
    assert all(row["age_group"] != "10-20" for row in rows), "the rare group must not appear"


def test_the_release_really_is_k_anonymous(client, make_cohort, make_user, auth_header) -> None:
    """Check the property itself, not just the counts."""
    for age in ("40-50", "50-60", "60-70"):
        make_cohort(25, 2, age_group=age)
    make_cohort(4, 1, age_group="20-30")
    researcher = make_user(Role.RESEARCHER)

    response = client.get("/api/v1/reports/research-dataset?k=10", headers=auth_header(researcher))
    _, rows = parse_csv(response.text)

    classes: dict[tuple, int] = {}
    for row in rows:
        key = tuple(row[q] for q in reports_service.QUASI_IDENTIFIERS)
        classes[key] = classes.get(key, 0) + 1
    assert classes, "nothing was released"
    assert min(classes.values()) >= 10


def test_k_cannot_be_lowered_below_five(client, make_user, auth_header) -> None:
    researcher = make_user(Role.RESEARCHER)
    response = client.get("/api/v1/reports/research-dataset?k=1", headers=auth_header(researcher))
    assert response.status_code == 422


def test_rows_are_not_released_in_database_order(
    client, make_cohort, make_user, auth_header
) -> None:
    """Row position must reveal nothing: order is by pseudonym, not by insertion."""
    make_cohort(60, 6)
    researcher = make_user(Role.RESEARCHER)
    response = client.get("/api/v1/reports/research-dataset", headers=auth_header(researcher))
    _, rows = parse_csv(response.text)

    pseudonyms = [row["pseudo_id"] for row in rows]
    assert pseudonyms == sorted(pseudonyms)


@pytest.mark.parametrize("role", [Role.DOCTOR, Role.HOSPITAL_ADMIN])
def test_only_researchers_and_admins_export_the_research_dataset(
    role: Role, client, make_user, auth_header
) -> None:
    actor = make_user(role)
    response = client.get("/api/v1/reports/research-dataset", headers=auth_header(actor))
    assert response.status_code == 403


def test_the_research_export_is_audited_with_its_k(
    client, db, make_cohort, make_user, auth_header
) -> None:
    make_cohort(60, 6)
    researcher = make_user(Role.RESEARCHER)
    client.get("/api/v1/reports/research-dataset?k=12", headers=auth_header(researcher))

    entry = db.query(AuditLog).filter(AuditLog.action == "export.research_dataset").one()
    assert entry.actor_id == researcher.id
    assert "k:12" in entry.resource


def test_exports_require_authentication(client) -> None:
    assert client.get("/api/v1/reports/research-dataset").status_code == 401
    assert client.get("/api/v1/reports/hospital-performance").status_code == 401
