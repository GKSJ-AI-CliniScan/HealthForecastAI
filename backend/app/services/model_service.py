"""model service - business logic layer.

Loads the trained readmission model and scores admissions through it,
via Kanak's build_serving_features(), so predictions never silently skip
the 8 derived columns her a16_serving_fidelity.json shows are worth an
~41-point recall gap.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from app.core.config import settings
from app.models.admission import Admission
from app.models.patient import Patient

# Patch XGBoost MRO incompatibility with scikit-learn 1.6 __sklearn_tags__
def _patch_xgboost_tags():
    try:
        from xgboost import XGBClassifier
        from xgboost.sklearn import XGBModel
        import sklearn.utils._tags as sk_tags
        
        def _custom_sklearn_tags(self):
            tags = sk_tags.Tags()
            tags.requires_fit = True
            tags.classifier_tags = sk_tags.ClassifierTags()
            return tags
            
        XGBClassifier.__sklearn_tags__ = _custom_sklearn_tags
        XGBModel.__sklearn_tags__ = _custom_sklearn_tags
    except Exception:
        pass

_patch_xgboost_tags()

# In-memory caches to prevent reloading artifacts on every request
_model: Any = None
_contract: dict[str, Any] | None = None
_metrics: dict[str, Any] | None = None


def get_artifact_dir() -> Path:
    """Dynamically resolve the ml/artifacts directory across Docker and local runs."""
    p = Path(settings.MODEL_ARTIFACT_DIR)
    if p.exists():
        return p.resolve()
    parent_p = Path.cwd().parent / settings.MODEL_ARTIFACT_DIR
    if parent_p.exists():
        return parent_p.resolve()
    source_p = Path(__file__).resolve().parents[3] / "ml" / "artifacts"
    if source_p.exists():
        return source_p.resolve()
    docker_p = Path("/app/ml/artifacts")
    if docker_p.exists():
        return docker_p.resolve()
    return p.resolve()


def _load_contract() -> dict[str, Any]:
    global _contract
    if _contract is None:
        contract_path = get_artifact_dir() / "feature_contract.json"
        if not contract_path.exists():
            raise FileNotFoundError(f"Feature contract not found at {contract_path}")
        _contract = json.loads(contract_path.read_text(encoding="utf-8"))
    return _contract


def _load_model() -> Any:
    global _model
    if _model is None:
        model_path = get_artifact_dir() / "readmission_model.joblib"
        if not model_path.exists():
            raise FileNotFoundError(f"No trained model found at {model_path}")
        _patch_xgboost_tags()
        _model = joblib.load(model_path)
    return _model


def get_metrics_data() -> dict[str, Any]:
    """Load and cache metrics.json produced during ML evaluation."""
    global _metrics
    if _metrics is None:
        metrics_path = get_artifact_dir() / "metrics.json"
        if not metrics_path.exists():
            return {}
        _metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    return _metrics


def _import_feature_builder():
    """Import lazily so a missing ml/ folder only breaks prediction, not app startup."""
    ml_root = get_artifact_dir().parent
    if str(ml_root) not in sys.path:
        sys.path.insert(0, str(ml_root))
    try:
        from src.serving.feature_builder import build_serving_features
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            f"ml/src/serving/feature_builder.py not found at {ml_root}."
        ) from exc
    return build_serving_features


def _safe_int(val: Any) -> int | None:
    """Safely convert value to int if possible, otherwise return None."""
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _admission_to_raw_row(patient: Patient, admission: Admission) -> dict[str, Any]:
    """Build the raw (pre-derived) row build_serving_features() expects."""
    return {
        # Numeric fields from DB
        "time_in_hospital": _safe_int(admission.time_in_hospital),
        "num_medications": _safe_int(admission.num_medications),
        "num_lab_procedures": _safe_int(admission.num_lab_procedures),
        "number_diagnoses": _safe_int(admission.number_diagnoses),
        "number_inpatient": _safe_int(getattr(admission, "number_inpatient", 0)) or 0,
        "number_emergency": _safe_int(getattr(admission, "number_emergency", 0)) or 0,
        "number_outpatient": _safe_int(getattr(admission, "number_outpatient", 0)) or 0,
        "num_procedures": None,
        
        # Categorical patient fields
        "age": patient.age_group,
        "race": patient.race,
        "gender": patient.gender,

        # Numeric IDs (must be int or None)
        "admission_type_id": _safe_int(getattr(admission, "admission_type_id", None)),
        "discharge_disposition_id": _safe_int(getattr(admission, "discharge_disposition_id", None)),
        "admission_source_id": _safe_int(getattr(admission, "admission_source_id", None)),

        # Clinical attributes & diagnoses
        "medical_specialty": None,
        "diag_1": getattr(admission, "diag_1", None),
        "diag_2": getattr(admission, "diag_2", None),
        "diag_3": getattr(admission, "diag_3", None),
        "max_glu_serum": None,
        "A1Cresult": None,
        "metformin": None, "repaglinide": None, "nateglinide": None,
        "chlorpropamide": None, "glimepiride": None, "acetohexamide": None,
        "glipizide": None, "glyburide": None, "tolbutamide": None,
        "pioglitazone": None, "rosiglitazone": None, "acarbose": None,
        "miglitol": None, "troglitazone": None, "tolazamide": None,
        "insulin": None,
        "glyburide-metformin": None, "glipizide-metformin": None,
        "glimepiride-pioglitazone": None, "metformin-rosiglitazone": None,
        "metformin-pioglitazone": None,
        "change": None,
        "diabetesMed": None,
    }


def _predict_proba_safe(model: Any, frame: pd.DataFrame) -> float:
    """Predict calibrated probability directly from fitted pipeline steps and calibrator."""
    # 1. Resolve pipeline and calibrator from CalibratedClassifierCV
    pipeline = model
    calibrator = None

    if hasattr(model, "calibrated_classifiers_") and len(model.calibrated_classifiers_) > 0:
        cc = model.calibrated_classifiers_[0]
        pipeline = getattr(cc, "estimator", model)
        if hasattr(pipeline, "estimator"):
            pipeline = pipeline.estimator
        if hasattr(cc, "calibrators_") and len(cc.calibrators_) > 0:
            calibrator = cc.calibrators_[0]

    # 2. Extract step-by-step transform and predict to bypass pipeline tag checks
    if hasattr(pipeline, "named_steps"):
        preprocessor = pipeline.named_steps["preprocess"]
        classifier = pipeline.named_steps["model"]
        
        # Transform features through ColumnTransformer
        x_trans = preprocessor.transform(frame)
        
        # Predict probability through XGBoost
        if hasattr(classifier, "predict_proba"):
            raw_proba = classifier.predict_proba(x_trans)[:, 1]
        else:
            raw_proba = classifier._Booster.inplace_predict(x_trans)[:, 1]
            
        # Apply isotonic calibrator if present
        if calibrator is not None:
            calibrated = calibrator.predict(raw_proba)
            return float(np.clip(calibrated[0], 0.0, 1.0))
        return float(raw_proba[0])

    # 3. Direct predict fallback
    return float(model.predict_proba(frame)[:, 1][0])


def predict(raw_row: dict[str, Any]) -> float:
    """Predict readmission probability from a raw feature dictionary."""
    build_serving_features = _import_feature_builder()
    model = _load_model()
    contract = _load_contract()

    built_row = build_serving_features(raw_row)
    frame = pd.DataFrame([built_row]).reindex(columns=contract["feature_order"])
    return _predict_proba_safe(model, frame)


def predict_probability(patient: Patient, admission: Admission) -> float:
    """Return the readmission probability for one patient admission."""
    raw_row = _admission_to_raw_row(patient, admission)
    return predict(raw_row)


def is_high_risk(probability: float) -> bool:
    """Flag using the model's calibrated threshold."""
    return probability >= _load_contract().get("decision_threshold", settings.RISK_THRESHOLD_HIGH)