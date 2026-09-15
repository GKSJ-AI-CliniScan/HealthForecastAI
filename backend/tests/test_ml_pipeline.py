"""Unit tests for ML pipeline preprocessing, risk engine, and model inference."""

from app.ml.inference.predictor import predictor
from app.ml.inference.risk_engine import (
    RISK_CATEGORY_CRITICAL,
    RISK_CATEGORY_HIGH,
    RISK_CATEGORY_LOW,
    RISK_CATEGORY_MEDIUM,
    risk_engine,
)
from app.ml.preprocessing.feature_engineering import map_icd9_category


def test_icd9_mapping():
    """Verify diagnostic ICD-9 code mapping logic."""
    assert map_icd9_category("410.1") == "Circulatory"
    assert map_icd9_category("493") == "Respiratory"
    assert map_icd9_category("250.02") == "Diabetes"
    assert map_icd9_category("585") == "Genitourinary"
    assert map_icd9_category("V45") == "Supplementary"
    assert map_icd9_category(None) == "Missing"


def test_risk_score_calculation():
    """Risk score must accurately map 0.0-1.0 probability to 0-100 integer."""
    assert risk_engine.calculate_risk_score(0.0) == 0
    assert risk_engine.calculate_risk_score(0.246) == 25
    assert risk_engine.calculate_risk_score(0.734) == 73
    assert risk_engine.calculate_risk_score(1.0) == 100
    assert risk_engine.calculate_risk_score(-0.5) == 0
    assert risk_engine.calculate_risk_score(1.5) == 100


def test_risk_category_thresholds():
    """Risk categories must respect standard clinical threshold bands."""
    # 0 - 25: LOW
    assert risk_engine.determine_risk_category(0) == RISK_CATEGORY_LOW
    assert risk_engine.determine_risk_category(25) == RISK_CATEGORY_LOW

    # 26 - 50: MEDIUM
    assert risk_engine.determine_risk_category(26) == RISK_CATEGORY_MEDIUM
    assert risk_engine.determine_risk_category(50) == RISK_CATEGORY_MEDIUM

    # 51 - 75: HIGH
    assert risk_engine.determine_risk_category(51) == RISK_CATEGORY_HIGH
    assert risk_engine.determine_risk_category(75) == RISK_CATEGORY_HIGH

    # 76 - 100: CRITICAL
    assert risk_engine.determine_risk_category(76) == RISK_CATEGORY_CRITICAL
    assert risk_engine.determine_risk_category(100) == RISK_CATEGORY_CRITICAL


def test_predictor_inference():
    """Predictor must load serialized artifacts and return valid prediction dictionary."""
    sample_input = {
        "time_in_hospital": 6,
        "num_medications": 18,
        "num_lab_procedures": 55,
        "number_diagnoses": 8,
        "number_inpatient": 2,
        "number_emergency": 1,
        "gender": "Female",
        "age": "[70-80)",
        "admission_type_id": 1,
        "discharge_disposition_id": 1,
        "admission_source_id": 7,
        "change": "Ch",
        "diabetesMed": "Yes",
    }

    result = predictor.predict(sample_input)

    assert "risk_score" in result
    assert 0 <= result["risk_score"] <= 100
    assert result["risk_category"] in [
        RISK_CATEGORY_LOW,
        RISK_CATEGORY_MEDIUM,
        RISK_CATEGORY_HIGH,
        RISK_CATEGORY_CRITICAL,
    ]
    assert 0.0 <= result["readmission_probability"] <= 1.0
    assert 0.0 <= result["confidence_score"] <= 1.0
    assert isinstance(result["contributing_factors"], list)
    assert len(result["contributing_factors"]) > 0
    assert "clinical_insights" in result
    assert "AI" not in result["clinical_insights"] or "decision" in result["clinical_insights"]
