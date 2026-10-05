"""Unit tests for Streamlit application components and prediction helpers."""
import pytest
from pathlib import Path
from streamlit_app import compute_prediction, load_metrics_json, REPO_ROOT


def test_repo_root_and_artifacts_exist():
    assert REPO_ROOT.exists()
    assert (REPO_ROOT / "streamlit_app.py").exists()
    assert (REPO_ROOT / "ml" / "artifacts" / "best_model.joblib").exists()
    assert (REPO_ROOT / "ml" / "artifacts" / "metrics.json").exists()


def test_load_metrics_json():
    metrics = load_metrics_json()
    assert "best_model" in metrics
    assert "results" in metrics
    assert "xgboost" in metrics["results"]
    assert metrics["results"]["xgboost"]["accuracy"] > 0.70
    assert metrics["results"]["xgboost"]["roc_auc"] > 0.65


def test_compute_prediction_high_risk():
    high_risk_patient = {
        "patient_id": 101,
        "time_in_hospital": 8,
        "num_medications": 18,
        "num_lab_procedures": 60,
        "number_diagnoses": 9,
        "number_emergency": 2,
        "number_inpatient": 1,
        "age": "[70-80)",
        "diabetesMed": "Yes",
        "change": "Ch",
    }
    prob = compute_prediction(high_risk_patient)
    assert 0.0 <= prob <= 1.0
    assert prob >= 0.25  # High-risk profile should produce elevated probability


def test_compute_prediction_low_risk():
    low_risk_patient = {
        "patient_id": 102,
        "time_in_hospital": 1,
        "num_medications": 3,
        "num_lab_procedures": 15,
        "number_diagnoses": 2,
        "number_emergency": 0,
        "number_inpatient": 0,
        "age": "[30-40)",
        "diabetesMed": "No",
        "change": "No",
    }
    prob = compute_prediction(low_risk_patient)
    assert 0.0 <= prob <= 1.0
    assert prob < 0.25  # Low-risk profile should produce minimal probability


def test_what_if_counterfactual_reduction():
    baseline_patient = {
        "patient_id": 103,
        "time_in_hospital": 8,
        "num_medications": 16,
        "number_emergency": 2,
        "number_inpatient": 1,
        "age": "[70-80)",
        "diabetesMed": "Yes",
    }
    intervened_patient = {
        "patient_id": 103,
        "time_in_hospital": 5,
        "num_medications": 8,
        "number_emergency": 1,
        "number_inpatient": 1,
        "age": "[70-80)",
        "diabetesMed": "Yes",
    }
    base_p = compute_prediction(baseline_patient)
    intervened_p = compute_prediction(intervened_patient)
    assert intervened_p < base_p  # Interventions must reduce readmission probability
