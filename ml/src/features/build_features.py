"""Feature engineering for readmission risk."""

from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.data.preprocess import split_feature_types


def map_icd9_series(series: pd.Series) -> pd.Series:
    """Categorise ICD-9 diagnosis codes into primary clinical condition groups."""
    s = series.astype(str).str.strip()
    num = pd.to_numeric(s, errors="coerce")

    circulatory = ((num >= 390) & (num <= 459)) | (num == 785)
    respiratory = ((num >= 460) & (num <= 519)) | (num == 786)
    digestive = ((num >= 520) & (num <= 579)) | (num == 787)
    diabetes = s.str.startswith("250")
    injury = (num >= 800) & (num <= 999)
    musculoskeletal = (num >= 710) & (num <= 739)
    genitourinary = ((num >= 580) & (num <= 629)) | (num == 788)
    neoplasms = (num >= 140) & (num <= 239)
    missing = series.isna() | (s == "?") | (s == "")

    cat = pd.Series("Other", index=series.index)
    cat[circulatory] = "Circulatory"
    cat[respiratory] = "Respiratory"
    cat[digestive] = "Digestive"
    cat[diabetes] = "Diabetes"
    cat[injury] = "Injury"
    cat[musculoskeletal] = "Musculoskeletal"
    cat[genitourinary] = "Genitourinary"
    cat[neoplasms] = "Neoplasms"
    cat[missing] = "Missing"
    return cat


def build_preprocessor(frame: pd.DataFrame, config: dict[str, Any]) -> ColumnTransformer:
    """Build the fitted-at-train-time preprocessing pipeline.

    Returning a ColumnTransformer (rather than transforming in place) keeps
    training and serving consistent - the same object is pickled with the model.
    """
    preprocessing = config.get("preprocessing", {})
    numeric, categorical = split_feature_types(frame)

    numeric_steps: list[tuple[str, Any]] = [
        (
            "impute",
            SimpleImputer(strategy=preprocessing.get("numeric_imputation", "median")),
        )
    ]
    if preprocessing.get("scale_numeric", True):
        numeric_steps.append(("scale", StandardScaler()))

    categorical_steps: list[tuple[str, Any]] = [
        (
            "impute",
            SimpleImputer(strategy=preprocessing.get("categorical_imputation", "most_frequent")),
        ),
        ("encode", OneHotEncoder(handle_unknown="ignore", min_frequency=0.005)),
    ]

    return ColumnTransformer(
        transformers=[
            ("numeric", Pipeline(numeric_steps), numeric),
            ("categorical", Pipeline(categorical_steps), categorical),
        ],
        remainder="drop",
    )


def add_utilisation_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Derive prior-utilisation and clinical risk features for readmission prediction."""
    result = frame.copy()

    # 1. Total healthcare utilization and ratios
    utilisation_columns = ["number_outpatient", "number_emergency", "number_inpatient"]
    if all(col in result.columns for col in utilisation_columns):
        result["prior_visits_total"] = result[utilisation_columns].sum(axis=1)
        result["inpatient_ratio"] = result["number_inpatient"] / (result["prior_visits_total"] + 1)
        result["has_prior_inpatient"] = (result["number_inpatient"] > 0).astype(int)
        result["high_emergency_user"] = (result["number_emergency"] >= 2).astype(int)
    elif "prior_visits_total" not in result.columns:
        result["prior_visits_total"] = 0
        result["inpatient_ratio"] = 0.0
        result["has_prior_inpatient"] = 0
        result["high_emergency_user"] = 0

    # 2. Polypharmacy risk indicators
    if "num_medications" in result.columns:
        result["is_polypharmacy"] = (result["num_medications"] >= 10).astype(int)
        result["extreme_polypharmacy"] = (result["num_medications"] >= 16).astype(int)
    else:
        result["is_polypharmacy"] = 0
        result["extreme_polypharmacy"] = 0

    # 3. Medication change indicator
    if "change" in result.columns:
        result["has_med_change"] = (
            result["change"].astype(str).str.strip().str.lower() == "ch"
        ).astype(int)
    else:
        result["has_med_change"] = 0

    # 4. Length of stay and clinical procedure intensity
    if "time_in_hospital" in result.columns:
        result["is_long_stay"] = (result["time_in_hospital"] >= 7).astype(int)
        if "num_lab_procedures" in result.columns:
            result["lab_intensity"] = result["num_lab_procedures"] / (
                result["time_in_hospital"] + 0.1
            )
        else:
            result["lab_intensity"] = 0.0
        if "num_procedures" in result.columns:
            result["procedure_intensity"] = result["num_procedures"] / (
                result["time_in_hospital"] + 0.1
            )
        else:
            result["procedure_intensity"] = 0.0
    else:
        result["is_long_stay"] = 0
        result["lab_intensity"] = 0.0
        result["procedure_intensity"] = 0.0

    # 5. Categorical identifier encoding
    for col in ["admission_type_id", "discharge_disposition_id", "admission_source_id"]:
        if col in result.columns:
            result[col] = result[col].astype(str)

    # 6. Age bracket to numeric approximation
    age_map = {
        "[0-10)": 5.0,
        "[10-20)": 15.0,
        "[20-30)": 25.0,
        "[30-40)": 35.0,
        "[40-50)": 45.0,
        "[50-60)": 55.0,
        "[60-70)": 65.0,
        "[70-80)": 75.0,
        "[80-90)": 85.0,
        "[90-100)": 95.0,
    }
    if "age" in result.columns:
        result["age_num"] = result["age"].map(age_map).fillna(65.0).astype(float)
    else:
        result["age_num"] = 65.0

    # 7. ICD-9 disease group mappings
    has_diabetes_cond = pd.Series(False, index=result.index)
    has_circ_cond = pd.Series(False, index=result.index)
    for d in ["diag_1", "diag_2", "diag_3"]:
        if d in result.columns:
            cat_series = map_icd9_series(result[d])
            result[f"{d}_cat"] = cat_series
            has_diabetes_cond = has_diabetes_cond | (cat_series == "Diabetes")
            has_circ_cond = has_circ_cond | (cat_series == "Circulatory")

    result["has_diabetes_diag"] = has_diabetes_cond.astype(int)
    result["has_circulatory_diag"] = has_circ_cond.astype(int)

    # 8. Active diabetes medications count
    med_cols = [
        "metformin",
        "repaglinide",
        "nateglinide",
        "chlorpropamide",
        "glimepiride",
        "acetohexamide",
        "glipizide",
        "glyburide",
        "tolbutamide",
        "pioglitazone",
        "rosiglitazone",
        "acarbose",
        "miglitol",
        "troglitazone",
        "tolazamide",
        "examide",
        "citoglipton",
        "insulin",
        "glyburide-metformin",
        "glipizide-metformin",
        "glimepiride-pioglitazone",
        "metformin-rosiglitazone",
        "metformin-pioglitazone",
    ]
    present_meds = [m for m in med_cols if m in result.columns]
    if present_meds:
        active_counts = pd.Series(0, index=result.index)
        for m in present_meds:
            active_counts += (
                ~result[m].astype(str).str.lower().isin(["no", "?", "nan", "none"])
            ).astype(int)
        result["active_meds_count"] = active_counts
    else:
        result["active_meds_count"] = 0

    if "insulin" in result.columns:
        result["on_insulin"] = (
            result["insulin"].astype(str).str.lower().isin(["up", "down", "steady"])
        ).astype(int)
    else:
        result["on_insulin"] = 0

    return result
