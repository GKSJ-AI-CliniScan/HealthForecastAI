"""Tests for the relational India Hospital Readmission loader and its targets.

Small hand-written CSVs in the real export's column layout - the real files
are never committed, so these pin loader/target behaviour, not model quality.
"""

import pandas as pd
import pytest

from src.data.load_data import load_relational_export
from src.features.build_features import INFERENCE_FEATURE_COLUMNS, normalise_gender
from src.models.train import build_target, train_one_target
from src.utils.config import load_config

TABLES = {"patients": "patients.csv", "admissions": "admissions.csv", "diagnoses": "diagnoses.csv"}


def _write_export(tmp_path, n_patients: int = 40, per_patient: int = 3) -> None:
    patients, admissions, diagnoses = [], [], []
    genders = ["M", "F", "Other"]
    discharges = ["Recovered", "LAMA", "Referred", "Expired"]
    for i in range(n_patients):
        pid = f"p{i}"
        patients.append({"patient_id": pid, "age": 20 + i, "gender": genders[i % 3], "state": "X"})
        for j in range(per_patient):
            aid = f"a{i}-{j}"
            day = pd.Timestamp("2016-01-01") + pd.Timedelta(days=30 * (i + 40 * j))
            admissions.append(
                {
                    "admission_id": aid,
                    "patient_id": pid,
                    "admit_date": day.date().isoformat(),
                    "discharge_date": (day + pd.Timedelta(days=2 + j)).date().isoformat(),
                    "los_days": 2 + j,
                    "admit_type": "Emergency" if (i + j) % 2 else "Elective",
                    "discharge_type": discharges[(i + j) % 4],
                    "readmitted_30d": int((i + j) % 3 == 0),
                    "readmitted_7d": 0,
                    "hba1c": 6.0,
                }
            )
            for rank in range(1, 2 + j % 2):
                diagnoses.append(
                    {
                        "diag_id": f"{aid}-{rank}",
                        "admission_id": aid,
                        "diag_desc": "Asthma" if rank == 1 else "Hypertension",
                        "diag_rank": rank,
                    }
                )
    # An admission whose patient is missing from patients.csv - must be dropped.
    admissions.append({**admissions[0], "admission_id": "orphan", "patient_id": "nobody"})
    pd.DataFrame(patients).to_csv(tmp_path / "patients.csv", index=False)
    pd.DataFrame(admissions).to_csv(tmp_path / "admissions.csv", index=False)
    pd.DataFrame(diagnoses).to_csv(tmp_path / "diagnoses.csv", index=False)


def _profile() -> dict:
    return load_config()["dataset"]["profiles"]["india_hospital_readmission"]


def test_loader_joins_tables_into_one_row_per_admission(tmp_path) -> None:
    _write_export(tmp_path)
    frame, provenance = load_relational_export(tmp_path, TABLES)

    assert len(frame) == 120  # orphan admission dropped
    assert provenance["admissions_without_patient"] == 1
    assert frame["admission_id"].is_unique
    assert {"admission_date", "length_of_stay", "admission_type", "diagnosis"} <= set(frame.columns)
    assert set(frame["number_diagnoses"]) == {1, 2}
    assert (frame["diagnosis"] == "Asthma").all()  # the rank-1 diagnosis, never rank 2
    assert "hba1c" not in frame.columns  # not part of the serving contract


def test_loader_records_file_provenance(tmp_path) -> None:
    _write_export(tmp_path)
    _, provenance = load_relational_export(tmp_path, TABLES)
    files = provenance["files"]
    assert files["admissions"]["rows"] == 121
    assert len(files["patients"]["sha256"]) == 64


def test_loader_rejects_a_file_missing_an_expected_column(tmp_path) -> None:
    _write_export(tmp_path)
    admissions = pd.read_csv(tmp_path / "admissions.csv").drop(columns=["readmitted_30d"])
    admissions.to_csv(tmp_path / "admissions.csv", index=False)
    with pytest.raises(ValueError, match="readmitted_30d"):
        load_relational_export(tmp_path, TABLES)


def test_loader_explains_a_missing_table(tmp_path) -> None:
    with pytest.raises(FileNotFoundError, match="ml/data/README.md"):
        load_relational_export(tmp_path, TABLES)


def test_normalise_gender_maps_free_text_onto_the_export_codes() -> None:
    result = normalise_gender(pd.Series(["Female", "male", "M", "F", "Other", "x", None, " "]))
    assert result.tolist()[:6] == ["F", "M", "M", "F", "Other", "Other"]
    assert result.iloc[6:].isna().all()


def test_readmission_target_excludes_expired_and_uses_the_export_label(tmp_path) -> None:
    _write_export(tmp_path)
    frame, _ = load_relational_export(tmp_path, TABLES)
    kept, target, drop, definition = build_target(frame, _profile(), "readmission")

    assert "Expired" not in set(kept["discharge_type"])
    assert target.tolist() == kept["readmitted_30d"].tolist()
    assert drop == []
    assert "30-day" in definition


def test_risk_target_is_death_or_30_day_readmission(tmp_path) -> None:
    _write_export(tmp_path)
    frame, _ = load_relational_export(tmp_path, TABLES)
    kept, target, drop, _ = build_target(frame, _profile(), "risk")

    expected = ((kept["discharge_type"] == "Expired") | (kept["readmitted_30d"] == 1)).astype(int)
    assert len(kept) == len(frame)
    assert target.tolist() == expected.tolist()
    assert drop == ["discharge_type"]


@pytest.mark.parametrize("target_name", ["risk", "readmission"])
def test_training_uses_exactly_the_serving_feature_contract(tmp_path, target_name) -> None:
    _write_export(tmp_path)
    frame, provenance = load_relational_export(tmp_path, TABLES)
    config = load_config()
    config["models"] = {
        "logistic_regression": {"enabled": True, "max_iter": 200},
        "random_forest": {"enabled": False},
        "xgboost": {"enabled": False},
    }
    config["split"]["validation_size"] = 0.2
    config["evaluation"]["thresholds"] = {"roc_auc": 0.0, "recall": 0.0}

    result = train_one_target(frame, _profile(), config, target_name, provenance)

    features = result["dataset"]["feature_columns"]
    leaked = {"readmitted_30d", "readmitted_7d", "admission_id", "patient_id", "admission_date"}
    assert not leaked & set(features)
    if target_name == "risk":
        assert features == [c for c in INFERENCE_FEATURE_COLUMNS if c != "discharge_type"]
    else:
        assert features == INFERENCE_FEATURE_COLUMNS
    assert result["dataset"]["split"]["strategy"] == "temporal"
    train_end = result["dataset"]["split"]["train_period"][1]
    test_start = result["dataset"]["split"]["test_period"][0]
    assert train_end <= test_start  # no future row in training
    assert result["dataset"]["files"]["admissions"]["rows"] == 121
