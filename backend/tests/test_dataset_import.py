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
    RelationalDatasetImportService,
    read_csv,
)


def india_tables() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Synthetic India Hospital Readmission export in its real column layout.

    IN1 has two admissions, IN2 one, IN3 none (and so is never selected).
    """
    patients = pd.DataFrame(
        {
            "patient_id": ["IN1", "IN2", "IN3"],
            "age": [61, 44, 30],
            "gender": ["F", "M", "Other"],
            "state": ["Kerala", "Goa", "Assam"],
        }
    )
    admissions = pd.DataFrame(
        {
            "admission_id": ["A1", "A2", "A3"],
            "patient_id": ["IN1", "IN1", "IN2"],
            "admit_date": ["2024-01-05", "2024-06-01", "2024-02-01"],
            "discharge_date": ["2024-01-09", "2024-06-03", "2024-02-04"],
            "los_days": [4, 2, 3],
            "admit_type": ["Emergency", "Elective", "OPD"],
            "ward_type": ["ICU", "General", "General"],
            "discharge_type": ["Recovered", "LAMA", "Referred"],
            "readmitted_30d": [1, 0, 0],
            "readmitted_7d": [0, 0, 0],
        }
    )
    diagnoses = pd.DataFrame(
        {
            "admission_id": ["A1", "A1", "A2", "A3"],
            "diag_desc": ["Asthma", "Hypertension", "Heart failure", "Diabetes"],
            "diag_rank": [1, 2, 1, 1],
        }
    )
    return patients, admissions, diagnoses


def india_importer(db_session: Session) -> RelationalDatasetImportService:
    return RelationalDatasetImportService(db_session, INDIA_HOSPITAL_READMISSION)


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
    patients, admissions, diagnoses = india_tables()
    admissions.loc[0, ["admit_date", "discharge_date"]] = ["2024-03-10", "2024-03-01"]
    summary = india_importer(db_session).import_frames(
        patients, admissions, diagnoses, patient_limit=None
    )
    assert summary.rejection_reasons == {"discharge_before_admission": 1}
    assert summary.admissions_created == len(admissions) - 1


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


def test_the_india_profile_maps_the_real_export_columns(db_session: Session) -> None:
    """Patients, admissions and diagnoses land in the operational tables."""
    patients, admissions, diagnoses = india_tables()
    india_importer(db_session).import_frames(patients, admissions, diagnoses, patient_limit=None)

    patient = db_session.query(Patient).filter_by(medical_record_number="IN1").one()
    assert patient.age_group == "61"
    assert patient.gender == "F"
    # Rank-1 diagnosis of the patient's MOST RECENT admission.
    assert patient.primary_diagnosis == "Heart failure"

    first = (
        db_session.query(Admission)
        .filter_by(patient_id=patient.id)
        .order_by(Admission.admission_date)
        .first()
    )
    assert first is not None
    assert str(first.admission_date) == "2024-01-05"
    assert first.time_in_hospital == 4
    assert first.admission_type == "Emergency"
    assert first.discharge_disposition == "Recovered"
    assert first.number_diagnoses == 2  # every diagnosis row for the admission
    assert first.readmitted == "<30"
    assert first.department is None  # the export has no department


def test_both_profiles_are_selectable_by_name() -> None:
    """The CLI resolves a profile from its name."""
    assert set(PROFILES) == {"diabetes_130_us", "india_hospital_readmission"}


def test_the_india_profile_documents_its_unmapped_fields() -> None:
    """Export fields with no column in the mentor's schema are recorded, not dropped silently."""
    note = INDIA_HOSPITAL_READMISSION.unmapped_note
    for field_name in ("state", "ward_type", "charlson_index", "billing.csv", "department"):
        assert field_name in note


def test_reading_a_missing_file_explains_where_to_get_it() -> None:
    """The error points at the download instructions rather than a bare traceback."""
    with pytest.raises(FileNotFoundError, match="ml/data/README.md"):
        read_csv("ml/data/raw/does-not-exist.csv")


# --------------------------------------------------------------------------
# Relational India export: limits, dry runs, idempotency, safety
# --------------------------------------------------------------------------


def test_dry_run_reports_without_writing(db_session: Session) -> None:
    summary = india_importer(db_session).import_frames(
        *india_tables(), patient_limit=None, dry_run=True
    )
    assert summary.dry_run is True
    assert (summary.patients_created, summary.admissions_created) == (2, 3)
    assert db_session.query(Patient).count() == 0
    assert db_session.query(Admission).count() == 0


def test_patient_limit_loads_whole_histories_for_the_first_n_patients(
    db_session: Session,
) -> None:
    summary = india_importer(db_session).import_frames(*india_tables(), patient_limit=1)
    assert summary.patients_created == 1
    assert summary.admissions_created == 2  # both of IN1's admissions, never half a history
    assert [p.medical_record_number for p in db_session.query(Patient)] == ["IN1"]


def test_patients_without_admissions_are_not_selected(db_session: Session) -> None:
    india_importer(db_session).import_frames(*india_tables(), patient_limit=10)
    keys = {p.medical_record_number for p in db_session.query(Patient)}
    assert keys == {"IN1", "IN2"}


def test_a_non_positive_limit_is_refused(db_session: Session) -> None:
    with pytest.raises(ValueError, match="positive"):
        india_importer(db_session).import_frames(*india_tables(), patient_limit=0)


def test_rerunning_the_relational_import_is_idempotent(db_session: Session) -> None:
    importer = india_importer(db_session)
    importer.import_frames(*india_tables(), patient_limit=1)
    second = importer.import_frames(*india_tables(), patient_limit=None)

    assert (second.patients_existing, second.admissions_existing) == (1, 2)
    assert (second.patients_created, second.admissions_created) == (1, 1)
    assert db_session.query(Patient).count() == 2
    assert db_session.query(Admission).count() == 3

    third = importer.import_frames(*india_tables(), patient_limit=None)
    assert (third.patients_created, third.admissions_created) == (0, 0)
    assert db_session.query(Admission).count() == 3


def test_same_day_admissions_that_differ_are_both_kept(db_session: Session) -> None:
    """The real export has one patient with two distinct same-date admissions."""
    patients, admissions, diagnoses = india_tables()
    twin = admissions.iloc[[0]].assign(admission_id="A1b", discharge_type="LAMA")
    admissions = pd.concat([admissions, twin], ignore_index=True)
    summary = india_importer(db_session).import_frames(
        patients, admissions, diagnoses, patient_limit=None
    )
    assert summary.admissions_created == 4


def test_existing_records_are_never_modified(db_session: Session) -> None:
    db_session.add(
        Patient(
            medical_record_number="IN1", age_group="70", gender="Female", primary_diagnosis="Kept"
        )
    )
    db_session.add(Patient(medical_record_number="LOCAL-1", primary_diagnosis="Unrelated"))
    db_session.commit()

    india_importer(db_session).import_frames(*india_tables(), patient_limit=None)

    kept = db_session.query(Patient).filter_by(medical_record_number="IN1").one()
    assert (kept.age_group, kept.gender, kept.primary_diagnosis) == ("70", "Female", "Kept")
    assert db_session.query(Patient).filter_by(medical_record_number="LOCAL-1").one()


def test_admissions_for_unknown_patients_are_rejected(db_session: Session) -> None:
    patients, admissions, diagnoses = india_tables()
    stray = admissions.iloc[[0]].assign(admission_id="A9", patient_id="NOBODY")
    admissions = pd.concat([admissions, stray], ignore_index=True)
    diagnoses = pd.concat(
        [
            diagnoses,
            pd.DataFrame({"admission_id": ["GHOST"], "diag_desc": ["X"], "diag_rank": [1]}),
        ],
        ignore_index=True,
    )
    summary = india_importer(db_session).import_frames(
        patients, admissions, diagnoses, patient_limit=None
    )
    assert summary.rejection_reasons == {"unknown_patient": 1}
    assert summary.orphan_diagnoses == 1
    assert db_session.query(Patient).filter_by(medical_record_number="NOBODY").first() is None


def test_implausible_patient_ages_reject_their_admissions(db_session: Session) -> None:
    patients, admissions, diagnoses = india_tables()
    patients.loc[0, "age"] = 200
    summary = india_importer(db_session).import_frames(
        patients, admissions, diagnoses, patient_limit=None
    )
    assert summary.rejection_reasons == {"implausible_age": 2}
    assert db_session.query(Patient).filter_by(medical_record_number="IN1").first() is None


def test_a_failure_part_way_rolls_back_the_whole_import(db_session: Session, monkeypatch) -> None:
    """Patients are flushed before admissions; a failure inserting admissions
    must still leave no patient behind."""
    importer = india_importer(db_session)
    original_add_all = db_session.add_all
    calls = {"n": 0}

    def failing_add_all(instances):
        calls["n"] += 1
        if calls["n"] == 2:  # 1st call adds patients, 2nd adds admissions
            raise RuntimeError("simulated database failure")
        return original_add_all(instances)

    monkeypatch.setattr(db_session, "add_all", failing_add_all)
    with pytest.raises(RuntimeError):
        importer.import_frames(*india_tables(), patient_limit=None)
    monkeypatch.undo()

    assert calls["n"] == 2
    assert db_session.query(Patient).count() == 0
    assert db_session.query(Admission).count() == 0


def test_a_table_missing_a_column_is_refused_before_any_write(db_session: Session) -> None:
    patients, admissions, diagnoses = india_tables()
    with pytest.raises(ValueError, match="readmitted_30d"):
        india_importer(db_session).import_frames(
            patients, admissions.drop(columns=["readmitted_30d"]), diagnoses, patient_limit=None
        )
    assert db_session.query(Patient).count() == 0


def test_import_export_reads_the_three_tables_from_a_directory(
    tmp_path, db_session: Session
) -> None:
    patients, admissions, diagnoses = india_tables()
    patients.to_csv(tmp_path / "patients.csv", index=False)
    admissions.to_csv(tmp_path / "admissions.csv", index=False)
    diagnoses.to_csv(tmp_path / "diagnoses.csv", index=False)

    summary = india_importer(db_session).import_export(tmp_path, patient_limit=1)
    assert (summary.patients_created, summary.admissions_created) == (1, 2)


def test_a_missing_table_file_explains_where_to_get_it(tmp_path, db_session: Session) -> None:
    with pytest.raises(FileNotFoundError, match="ml/data/README.md"):
        india_importer(db_session).import_export(tmp_path, patient_limit=1)


def test_the_single_csv_import_also_supports_a_dry_run(tmp_path, db_session: Session) -> None:
    path = tmp_path / "diabetic_data.csv"
    diabetes_frame().to_csv(path, index=False)
    summary = DatasetImportService(db_session, DIABETES_130_US).import_csv(path, dry_run=True)
    assert (summary.patients_created, summary.dry_run) == (2, True)
    assert db_session.query(Patient).count() == 0


# --------------------------------------------------------------------------
# Exact source ids (migration 0005)
# --------------------------------------------------------------------------


def test_fresh_import_stores_each_source_admission_id(db_session: Session) -> None:
    india_importer(db_session).import_frames(*india_tables(), patient_limit=None)
    stored = {a.source_admission_id for a in db_session.query(Admission)}
    assert stored == {"A1", "A2", "A3"}


def test_reimport_matches_exactly_even_after_an_imported_row_was_edited(
    db_session: Session,
) -> None:
    """Natural-key matching would duplicate an edited row; source ids do not."""
    importer = india_importer(db_session)
    importer.import_frames(*india_tables(), patient_limit=None)
    edited = db_session.query(Admission).filter_by(source_admission_id="A1").one()
    edited.time_in_hospital = 99
    edited.discharge_disposition = "Corrected in app"
    db_session.commit()

    again = importer.import_frames(*india_tables(), patient_limit=None)

    assert (again.admissions_created, again.admissions_existing) == (0, 3)
    assert db_session.query(Admission).count() == 3
    kept = db_session.query(Admission).filter_by(source_admission_id="A1").one()
    assert (kept.time_in_hospital, kept.discharge_disposition) == (99, "Corrected in app")


def test_legacy_rows_without_a_source_id_are_adopted_not_duplicated(
    db_session: Session,
) -> None:
    """Rows imported before 0005 get their source id filled in, nothing else."""
    importer = india_importer(db_session)
    importer.import_frames(*india_tables(), patient_limit=None)
    for admission in db_session.query(Admission):
        admission.source_admission_id = None  # simulate a pre-0005 import
    db_session.commit()
    ids_before = {a.id for a in db_session.query(Admission)}

    summary = importer.import_frames(*india_tables(), patient_limit=None)

    assert (summary.legacy_adopted, summary.admissions_created) == (3, 0)
    assert {a.id for a in db_session.query(Admission)} == ids_before
    assert {a.source_admission_id for a in db_session.query(Admission)} == {"A1", "A2", "A3"}
    third = importer.import_frames(*india_tables(), patient_limit=None)
    assert (third.legacy_adopted, third.admissions_existing) == (0, 3)


def test_app_created_admissions_are_never_adopted(db_session: Session) -> None:
    """A legacy row that does not match the source exactly stays untouched."""
    patient = Patient(medical_record_number="IN1")
    db_session.add(patient)
    db_session.flush()
    db_session.add(Admission(patient_id=patient.id, time_in_hospital=11, admission_type="Elective"))
    db_session.commit()

    summary = india_importer(db_session).import_frames(*india_tables(), patient_limit=None)

    assert summary.legacy_adopted == 0
    manual = db_session.query(Admission).filter_by(time_in_hospital=11).one()
    assert manual.source_admission_id is None
    assert db_session.query(Admission).count() == 4


def test_a_source_id_already_owned_by_another_patient_is_rejected(
    db_session: Session,
) -> None:
    importer = india_importer(db_session)
    importer.import_frames(*india_tables(), patient_limit=None)
    patients, admissions, diagnoses = india_tables()
    admissions.loc[admissions["admission_id"] == "A3", "patient_id"] = "IN1"

    summary = importer.import_frames(patients, admissions, diagnoses, patient_limit=None)

    assert summary.rejection_reasons == {"source_id_belongs_to_another_patient": 1}
    owner = db_session.query(Admission).filter_by(source_admission_id="A3").one()
    assert db_session.get(Patient, owner.patient_id).medical_record_number == "IN2"


# --------------------------------------------------------------------------
# Diabetes 130-US: encounter_id as a namespaced source id
# --------------------------------------------------------------------------


def test_rerunning_the_same_diabetes_export_adds_nothing(
    importer: DatasetImportService, db_session: Session
) -> None:
    importer.import_frame(diabetes_frame())
    again = importer.import_frame(diabetes_frame())
    assert (again.admissions_created, again.admissions_existing) == (0, 2)
    assert (again.patients_created, db_session.query(Admission).count()) == (0, 2)


def test_diabetes_source_ids_are_namespaced_by_profile(
    importer: DatasetImportService, db_session: Session
) -> None:
    importer.import_frame(diabetes_frame())
    stored = {a.source_admission_id for a in db_session.query(Admission)}
    assert stored == {"diabetes_130_us:1", "diabetes_130_us:2"}


def test_an_export_without_encounter_ids_keeps_the_original_behaviour(
    importer: DatasetImportService, db_session: Session
) -> None:
    frame = diabetes_frame().drop(columns=["encounter_id"])
    importer.import_frame(frame)
    importer.import_frame(frame)
    assert db_session.query(Admission).count() == 4
    assert {a.source_admission_id for a in db_session.query(Admission)} == {None}


def test_an_encounter_id_owned_by_another_patient_is_rejected(
    importer: DatasetImportService, db_session: Session
) -> None:
    importer.import_frame(diabetes_frame())
    clash = importer.import_frame(diabetes_frame(patient_nbr=["P9", "P2"]))
    assert clash.rejection_reasons == {"source_id_belongs_to_another_patient": 1}
    assert db_session.query(Patient).filter_by(medical_record_number="P9").first() is None
    assert db_session.query(Admission).count() == 2


def test_blank_encounter_ids_are_rejected_not_collapsed_or_duplicated(
    importer: DatasetImportService, db_session: Session
) -> None:
    """Regression: blank encounter ids used to dedupe into one row (silently
    dropping the others as "duplicates") and that row was re-added on every
    re-run because it had no source id to match."""
    frame = diabetes_frame(encounter_id=[None, None], patient_nbr=["P1", "P2"])
    first = importer.import_frame(frame)
    assert first.duplicates_dropped == 0
    assert first.rejection_reasons == {"missing_encounter_identifier": 2}
    assert first.admissions_created == 0

    again = importer.import_frame(frame)
    assert again.admissions_created == 0
    assert db_session.query(Admission).count() == 0


def test_a_blank_encounter_id_does_not_block_the_rest_of_the_file(
    importer: DatasetImportService, db_session: Session
) -> None:
    frame = diabetes_frame(encounter_id=[None, 7], patient_nbr=["P1", "P2"])
    summary = importer.import_frame(frame)
    assert summary.rejection_reasons == {"missing_encounter_identifier": 1}
    assert {a.source_admission_id for a in db_session.query(Admission)} == {"diabetes_130_us:7"}


def test_encounter_ids_read_as_floats_match_integer_ids_on_reimport(
    importer: DatasetImportService, db_session: Session
) -> None:
    """pandas reads an id column holding any blank as float (7.0); the stored
    source id must still be "...:7" so a clean re-export matches it."""
    importer.import_frame(diabetes_frame(encounter_id=[7.0, 8.0]))
    again = importer.import_frame(diabetes_frame(encounter_id=[7, 8]))
    assert (again.admissions_created, again.admissions_existing) == (0, 2)
    stored = {a.source_admission_id for a in db_session.query(Admission)}
    assert stored == {"diabetes_130_us:7", "diabetes_130_us:8"}


def test_diabetes_csv_missing_value_tokens_become_null(
    tmp_path, importer: DatasetImportService, db_session: Session
) -> None:
    """The real export writes "?" for unknown race and "Unknown/Invalid" for
    gender; read_csv must turn both into NULL rather than storing the token."""
    path = tmp_path / "diabetic_data.csv"
    diabetes_frame(race=["?", "Asian"], gender=["Unknown/Invalid", "Male"]).to_csv(
        path, index=False
    )
    importer.import_csv(path)
    patient = db_session.query(Patient).filter_by(medical_record_number="P1").one()
    assert (patient.race, patient.gender) == (None, None)


def test_diabetes_dry_run_reports_existing_without_writing(
    tmp_path, importer: DatasetImportService, db_session: Session
) -> None:
    importer.import_frame(diabetes_frame())
    path = tmp_path / "diabetic_data.csv"
    diabetes_frame(encounter_id=[1, 3], patient_nbr=["P1", "P3"]).to_csv(path, index=False)
    summary = importer.import_csv(path, dry_run=True)
    assert (summary.admissions_existing, summary.admissions_created) == (1, 1)
    assert db_session.query(Admission).count() == 2


def test_legacy_diabetes_rows_without_a_source_id_are_left_untouched(
    importer: DatasetImportService, db_session: Session
) -> None:
    """No natural key is proven unique for this export, so pre-0005 rows are
    never adopted; a re-import adds the source-id rows alongside them."""
    importer.import_frame(diabetes_frame())
    for admission in db_session.query(Admission):
        admission.source_admission_id = None
    db_session.commit()
    importer.import_frame(diabetes_frame())
    assert db_session.query(Admission).filter(Admission.source_admission_id.is_(None)).count() == 2
    assert db_session.query(Admission).count() == 4
