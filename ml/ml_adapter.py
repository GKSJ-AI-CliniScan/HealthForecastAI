"""
ml_adapter.py -- connects the tests to YOUR HealthForecastAI/ml project.

PLACE this file, risk_logic.py (or src/risk/), pytest.ini and tests/ inside
HealthForecastAI/ml/  (the folder that contains src/, configs/, data/, artifacts/).

REAL mode  : your src.* functions, config.yaml, raw CSV and trained pipeline are found.
DEMO mode  : otherwise -> synthetic data + demo model (numbers NOT valid for the report).
Set REQUIRE_REAL=1 to make the suite fail instead of silently falling back to demo.
"""
from __future__ import annotations
import os
import sys
from pathlib import Path
import numpy as np
import pandas as pd

ML_DIR = Path(os.getenv("ML_DIR", Path(__file__).resolve().parent))
sys.path.insert(0, str(ML_DIR))

import risk_logic as RL  # noqa: E402  (move to src.risk.risk_logic if you relocate it)

# >>> EDIT if needed <<< --------------------------------------------------------------
CONFIG_PATH = ML_DIR / "configs" / "config.yaml"
MODEL_CANDIDATES = [ML_DIR / "artifacts" / "readmission_model.joblib",
                    ML_DIR.parent / "ml" / "artifacts" / "readmission_model.joblib"]
RAW_CANDIDATES = [ML_DIR / "data" / "raw" / "diabetic_data.csv",
                  ML_DIR.parent / "ml" / "data" / "raw" / "diabetic_data.csv"]
CLEANED_CANDIDATES = [ML_DIR / "diabetic_data_cleaned.csv", ML_DIR / "data" / "diabetic_data_cleaned.csv"]
# Hold-out split. MUST match how you trained (check your train script / config.yaml).
TEST_SIZE, SPLIT_SEED = 0.2, 42
# Cut-off used to turn a probability into "will be readmitted". 0.4 = Medium-or-High flagged.
DECISION_THRESHOLD = RL.MEDIUM_THRESHOLD
RISK_BANDS = (RL.MEDIUM_THRESHOLD, RL.HIGH_THRESHOLD)
# Pass criteria - agree with mentor BEFORE looking at the results.
THRESHOLDS = {
    "roc_auc": 0.60,      # Diabetes-130 (<30 d) typically 0.63-0.69
    "recall": 0.40,
    "precision": 0.12,    # base rate ~11% (a bit different after your first-encounter filter)
    "f1": 0.20,
    "accuracy": 0.40,     # secondary: misleading on imbalanced data, and a 0.4 cut-off flags many patients
    "max_predict_ms_single": 500,
    "max_predict_s_batch_1000": 5.0,
}
# ----------------------------------------------------------------------------------

def _first_existing(paths):
    return next((p for p in paths if Path(p).exists()), None)

MODEL_PATH = _first_existing(MODEL_CANDIDATES)
RAW_PATH = _first_existing(RAW_CANDIDATES)
CLEANED_PATH = _first_existing(CLEANED_CANDIDATES)

_REAL_ERR = None
try:
    if not (MODEL_PATH and RAW_PATH and CONFIG_PATH.exists()):
        raise FileNotFoundError(f"model={MODEL_PATH} raw={RAW_PATH} config={CONFIG_PATH}")
    from src.utils.config import load_config
    from src.data.load_data import load_raw, binarise_target
    from src.data.preprocess import basic_clean
    from src.features.build_features import add_utilisation_features
    CONFIG = load_config(str(CONFIG_PATH))
    TARGET_COL = CONFIG["dataset"]["target_column"]
    POSITIVE_LABEL = CONFIG["dataset"]["positive_label"]
    DEMO_MODE = False
except Exception as e:                      # noqa: BLE001
    _REAL_ERR = repr(e)
    DEMO_MODE = True
    CONFIG, TARGET_COL, POSITIVE_LABEL = {}, "readmitted", "<30"
    if os.getenv("REQUIRE_REAL") == "1":
        raise RuntimeError(f"REAL mode requested but setup failed: {_REAL_ERR}")

TARGET_MODE = "within_30_days"   # (demo only; real mode uses config positive_label)
DROP_COLS = ["encounter_id", "patient_nbr", "weight", "payer_code", "medical_specialty"] if DEMO_MODE else []


# ------------------------------------------------------------------ data ----
def _demo_data(n: int = 20000, seed: int = 7) -> pd.DataFrame:
    r = np.random.default_rng(seed)
    df = pd.DataFrame({
        "encounter_id": np.arange(n),
        "patient_nbr": r.integers(1, n // 2, n),
        "race": r.choice(["Caucasian", "AfricanAmerican", "Hispanic", "?"], n, p=[.7, .2, .05, .05]),
        "gender": r.choice(["Male", "Female"], n),
        "age": r.choice(RL.AGE_ORDER[3:9], n),
        "weight": "?", "payer_code": r.choice(["?", "MC"], n), "medical_specialty": r.choice(["?", "Cardiology"], n),
        "discharge_disposition_id": r.choice([1, 1, 1, 3, 6, 11, 13, 20], n),
        "time_in_hospital": r.integers(1, 14, n),
        "num_lab_procedures": r.integers(1, 100, n),
        "num_medications": r.integers(1, 60, n),
        "number_inpatient": r.poisson(0.6, n),
        "number_emergency": r.poisson(0.3, n),
        "number_diagnoses": r.integers(3, 16, n),
        "insulin": r.choice(["No", "Steady", "Up", "Down"], n),
        "change": r.choice(["No", "Ch"], n),
        "diabetesMed": r.choice(["Yes", "No"], n),
    })
    logit = (-3.6 + 0.55 * df.number_inpatient + 0.45 * df.number_emergency
             + 0.09 * df.time_in_hospital + 0.08 * df.number_diagnoses)
    p = 1 / (1 + np.exp(-logit)); u = r.random(n)
    df["readmitted"] = np.where(u < p, "<30", np.where(u < p + 0.25, ">30", "NO"))
    return df


def load_raw_untouched() -> pd.DataFrame:
    """Raw CSV exactly as shipped ('?' kept) - input to the Milestone-1 cleaning checks."""
    return _demo_data() if DEMO_MODE else pd.read_csv(RAW_PATH)


def clean_like_milestone1(df: pd.DataFrame) -> pd.DataFrame:
    """Replica of the Milestone-1 notebook cleaning (kept in sync by hand)."""
    d = df.replace("?", np.nan).drop(columns=["weight", "medical_specialty", "payer_code"], errors="ignore")
    d = d.dropna(subset=["race"])
    d = d[~d["discharge_disposition_id"].isin([11, 13, 14, 19, 20, 21])]
    return d.sort_values("encounter_id").drop_duplicates(subset="patient_nbr", keep="first")


def load_cleaned() -> pd.DataFrame:
    if CLEANED_PATH is not None:
        return pd.read_csv(CLEANED_PATH)
    return clean_like_milestone1(load_raw_untouched())


def load_raw_data() -> pd.DataFrame:
    """The modelling frame = what Milestone 2 builds (human-readable columns + target)."""
    if DEMO_MODE:
        return _demo_data().replace("?", np.nan)
    frame = load_raw(str(RAW_PATH))
    frame = basic_clean(frame, CONFIG)
    return add_utilisation_features(frame)


def make_target(df: pd.DataFrame) -> pd.Series:
    if DEMO_MODE:
        return (df[TARGET_COL] == POSITIVE_LABEL).astype(int)
    return binarise_target(df[TARGET_COL], POSITIVE_LABEL)


def get_features(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop(columns=[TARGET_COL] + [c for c in DROP_COLS if c in df.columns])


# ----------------------------------------------------------------- model ----
def load_model():
    import joblib
    return _train_demo_model() if DEMO_MODE else joblib.load(MODEL_PATH)


def predict_proba(model, X: pd.DataFrame) -> np.ndarray:
    out = np.asarray(model.predict_proba(X))
    return out[:, 1] if out.ndim == 2 else out.ravel()


def risk_category(p: float) -> str:
    return RL.assign_risk_level(p)


def _train_demo_model():
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.impute import SimpleImputer
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder
    df = load_raw_data()
    X, y = get_features(df), make_target(df)
    X, _, y, _ = train_test_split(X, y, test_size=TEST_SIZE, stratify=y, random_state=SPLIT_SEED)
    cat = X.select_dtypes(exclude="number").columns.tolist()
    num = X.select_dtypes(include="number").columns.tolist()
    pre = ColumnTransformer([
        ("num", SimpleImputer(strategy="median"), num),
        ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")),
                          ("oh", OneHotEncoder(handle_unknown="ignore"))]), cat)])
    return Pipeline([("pre", pre), ("clf", RandomForestClassifier(
        n_estimators=150, min_samples_leaf=60, max_depth=7, class_weight="balanced",
        random_state=42, n_jobs=-1))]).fit(X, y)
