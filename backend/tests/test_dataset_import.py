"""Dataset import tests.

Every fixture here is synthetic. docs/07-testing forbids testing against real
patient data, and the real exports are never committed to the repository.
"""

import pandas as pd
import pytest
from sqlalchemy.orm import Session

from app.models.admission import Admission
from app.models.patient import Patient
from app.services.dataset_import_service import (
    DIABETES_130_US,
    INDIA_HOSPITAL_READMISSION,
    PROFILES,
    DatasetImportService,
    read_csv,
)


def diabetes_frame(**overrides) -> pd.DataFrame:
    """Return a two row Diabetes 130-US style export."""
    base = {
        "encounter_id": [1, 2],
        "patient_nbr": ["P1", "P2"],
        "race": ["Caucasian", "AfricanAmerican"],
        "gender": ["Female", "Male"],
        "age": ["[70-80)", "[50-60)"],
        "diag_1": ["250.83", "428"],
        "time_in_hospital": [4, 7],
        "admission_type_id": ["Emergency", "Elective"],
        "discharge_disposition_id": ["Home", "Home"],
        "num_medications": [12, 8],
        "num_lab_procedures": [41, 33],
        "number_diagnoses": [9, 5],
        "readmitted": ["NO", "<30"],
    }
    base.update(overrides)
    return pd.DataFrame(base)


@pytest.fixture
def importer(db_session: Session) -> DatasetImportService:
    return DatasetImportService(db_session, DIABETES_130_US)


# --------------------------------------------------------------------------
# Loading
# --------------------------------------------------------------------------


def test_import_creates_patients_and_admissions(
    importer: DatasetImportService, db_session: Session
) -> None:
    """One export row becomes one encounter attached to its patient."""
    summary = importer.import_frame(diabetes_frame())
    assert summary.patients_created == 2
    assert summary.admissions_created == 2
    assert db_session.query(Patient).count() == 2
    assert db_session.query(Admission).count() == 2


def test_mapped_columns_land_in_the_right_fields(
    importer: DatasetImportService, db_session: Session
) -> None:
    """The profile mapping is applied, not just the row count."""
    importer.import_frame(diabetes_frame())
    patient = db_session.query(Patient).filter_by(medical_record_number="P1").one()
    assert patient.age_group == "[70-80)"
    assert patient.gender == "Female"
    assert patient.primary_diagnosis == "250.83"

    admission = db_session.query(Admission).filter_by(patient_id=patient.id).one()
    assert admission.time_in_hospital == 4
    assert admission.num_medications == 12
    assert admission.readmitted == "NO"


def test_repeat_encounters_collapse_onto_one_patient(
    importer: DatasetImportService, db_session: Session
) -> None:
    """A patient seen twice is one person with two admissions.

    This is what makes prior-admission history available to Milestone 2.
    """
    frame = diabetes_frame(
        encounter_id=[1, 2],
        patient_nbr=["P1", "P1"],
        admission_type_id=["Emergency", "Elective"],
    )
    summary = importer.import_frame(frame)
    assert summary.patients_created == 1
    assert summary.admissions_created == 2
    assert db_session.query(Patient).count() == 1


def test_rerunning_the_import_reuses_existing_patients(
    importer: DatasetImportService, db_session: Session
) -> None:
    """A second run adds encounters instead of duplicating every person."""
    importer.import_frame(diabetes_frame())
    importer.import_frame(diabetes_frame(encounter_id=[3, 4]))
    assert db_session.query(Patient).count() == 2
    assert db_session.query(Admission).count() == 4


def test_limit_seeds_a_small_development_set(importer: DatasetImportService) -> None:
    """--limit imports a slice rather than the whole export."""
    assert importer.import_frame(diabetes_frame(), limit=1).admissions_created == 1


def test_missing_values_become_null_not_the_literal_token(
    importer: DatasetImportService, db_session: Session
) -> None:
    """'?' is this export's missing marker and must not be stored as text."""
    frame = diabetes_frame(race=[None, "Male"], diag_1=[None, "428"])
    importer.import_frame(frame)
    patient = db_session.query(Patient).filter_by(medical_record_number="P1").one()
    assert patient.race is None
    assert patient.primary_diagnosis is None


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------


def test_rows_without_a_patient_identifier_are_rejected(
    importer: DatasetImportService,
) -> None:
    """A row that cannot name a patient cannot be attached to one."""
    summary = importer.import_frame(diabetes_frame(patient_nbr=[None, "P2"]))
    assert summary.rows_rejected == 1
    assert summary.rejection_reasons == {"missing_patient_identifier": 1}
    assert summary.patients_created == 1


def test_implausible_ages_are_rejected(importer: DatasetImportService) -> None:
    """The SRS bounds age to a clinically possible range."""
    summary = importer.import_frame(diabetes_frame(age=["[200-210)", "[50-60)"]))
    assert summary.rejection_reasons == {"implausible_age": 1}


def test_negative_length_of_stay_is_rejected(importer: DatasetImportService) -> None:
    """A stay cannot run backwards."""
    summary = importer.import_frame(diabetes_frame(time_in_hospital=[-2, 7]))
    assert summary.rejection_reasons == {"negative_length_of_stay": 1}


def test_discharge_before_admission_is_rejected(db_session: Session) -> None:
    """The SRS date ordering rule is enforced before the row reaches the database."""
    service = DatasetImportService(db_session, INDIA_HOSPITAL_READMISSION)
    frame = pd.DataFrame(
        {
            "patient_id": ["IN1", "IN2"],
            "age": [61, 44],
            "gender": ["Female", "Male"],
            "diagnosis": ["Cardiac", "Diabetes"],
            "admission_date": ["2024-03-10", "2024-04-01"],
            "discharge_date": ["2024-03-01", "2024-04-05"],
            "length_of_stay": [None, 4],
            "readmitted": ["NO", "NO"],
        }
    )
    summary = service.import_frame(frame)
    assert summary.rejection_reasons == {"discharge_before_admission": 1}
    assert summary.admissions_created == 1


def test_a_rejected_row_does_not_stop_the_import(importer: DatasetImportService) -> None:
    """One bad row is quarantined; the rest of the export still loads."""
    summary = importer.import_frame(diabetes_frame(age=["[200-210)", "[50-60)"]))
    assert summary.rows_rejected == 1
    assert summary.admissions_created == 1


# --------------------------------------------------------------------------
# Cleaning
# --------------------------------------------------------------------------


def test_duplicate_encounters_are_dropped(importer: DatasetImportService) -> None:
    """The same encounter appearing twice is counted once."""
    frame = pd.concat([diabetes_frame(), diabetes_frame()], ignore_index=True)
    summary = importer.import_frame(frame)
    assert summary.duplicates_dropped == 2
    assert summary.admissions_created == 2


def test_deduplication_never_collapses_a_patients_history(
    importer: DatasetImportService,
) -> None:
    """Distinct encounters for one patient must all survive.

    Regression test. Deduplicating on the patient identifier alone would discard
    a patient's repeat admissions, which is the prior-utilisation signal the
    readmission model depends on most.
    """
    frame = diabetes_frame(
        encounter_id=[1, 2],
        patient_nbr=["P1", "P1"],
        time_in_hospital=[3, 9],
    )
    summary = importer.import_frame(frame)
    assert summary.duplicates_dropped == 0
    assert summary.patients_created == 1
    assert summary.admissions_created == 2


def test_absent_columns_are_reported_not_fatal(importer: DatasetImportService) -> None:
    """An export missing an optional column still imports, and says what was absent."""
    frame = diabetes_frame().drop(columns=["num_lab_procedures", "race"])
    summary = importer.import_frame(frame)
    assert summary.admissions_created == 2
    assert set(summary.missing_columns) == {"num_lab_procedures", "race"}


# --------------------------------------------------------------------------
# Profiles
# --------------------------------------------------------------------------


def test_the_india_profile_imports_its_own_column_names(db_session: Session) -> None:
    """The approved dataset loads through the same pipeline as the brief's."""
    service = DatasetImportService(db_session, INDIA_HOSPITAL_READMISSION)
    frame = pd.DataFrame(
        {
            "patient_id": ["IN1"],
            "age": [61],
            "gender": ["Female"],
            "diagnosis": ["Cardiac failure"],
            "admission_date": ["2024-03-01"],
            "discharge_date": ["2024-03-06"],
            "length_of_stay": [5],
            "admission_type": ["Emergency"],
            "medication_count": [7],
            "readmitted": ["<30"],
        }
    )
    summary = service.import_frame(frame)
    assert summary.patients_created == 1

    patient = db_session.query(Patient).one()
    assert patient.primary_diagnosis == "Cardiac failure"
    assert patient.age_group == "61"

    admission = db_session.query(Admission).one()
    assert admission.time_in_hospital == 5
    assert admission.num_medications == 7
    assert str(admission.admission_date) == "2024-03-01"


def test_both_profiles_are_selectable_by_name() -> None:
    """The CLI resolves a profile from its name."""
    assert set(PROFILES) == {"diabetes_130_us", "india_hospital_readmission"}


def test_the_india_profile_documents_its_unmapped_column() -> None:
    """'region' has no column in the mentor's schema, and that is recorded."""
    assert "region" in INDIA_HOSPITAL_READMISSION.unmapped_note


def test_reading_a_missing_file_explains_where_to_get_it() -> None:
    """The error points at the download instructions rather than a bare traceback."""
    with pytest.raises(FileNotFoundError, match="ml/data/README.md"):
        read_csv("ml/data/raw/does-not-exist.csv")
