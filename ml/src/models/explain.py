"""Risk driver extraction for the trained readmission model.

SHAP answers the question the dashboard actually asks - "why is this patient
high risk" - which a single global importance ranking cannot. The work here is
mostly plumbing around that: the saved artefact is a calibrated wrapper around a
Pipeline, so the tree model has to be unwrapped, and the model sees 206 one-hot
columns where a clinician needs the 51 columns those came from.

Two honest limits, repeated in the exported artefact so they travel with it:
SHAP explains the uncalibrated XGBoost margin, not the calibrated probability
(isotonic calibration is monotonic, so the ranking and the sign of each driver
survive, the absolute size does not), and a driver is an association, not a
cause.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.pipeline import Pipeline

SHAP_METHOD = "shap_tree_explainer"
FALLBACK_METHOD = "xgboost_feature_importances"

# Plain names for the 51 model input columns. Without these the dashboard would
# show "number_inpatient", which is a column name, not something to tell a nurse.
LABELS = {
    "race": "Race",
    "gender": "Gender",
    "age": "Age bracket",
    "admission_type_id": "Admission type",
    "discharge_disposition_id": "Discharge disposition",
    "admission_source_id": "Admission source",
    "time_in_hospital": "Length of stay (days)",
    "medical_specialty": "Admitting specialty",
    "num_lab_procedures": "Lab procedures this stay",
    "num_procedures": "Procedures this stay",
    "num_medications": "Distinct medications this stay",
    "number_outpatient": "Prior outpatient visits",
    "number_emergency": "Prior emergency visits",
    "number_inpatient": "Previous inpatient visits",
    "diag_1": "Primary diagnosis (ICD-9)",
    "diag_2": "Secondary diagnosis (ICD-9)",
    "diag_3": "Additional diagnosis (ICD-9)",
    "number_diagnoses": "Diagnoses recorded",
    "max_glu_serum": "Glucose serum test result",
    "A1Cresult": "HbA1c test result",
    "metformin": "Metformin dosage",
    "repaglinide": "Repaglinide dosage",
    "nateglinide": "Nateglinide dosage",
    "chlorpropamide": "Chlorpropamide dosage",
    "glimepiride": "Glimepiride dosage",
    "acetohexamide": "Acetohexamide dosage",
    "glipizide": "Glipizide dosage",
    "glyburide": "Glyburide dosage",
    "tolbutamide": "Tolbutamide dosage",
    "pioglitazone": "Pioglitazone dosage",
    "rosiglitazone": "Rosiglitazone dosage",
    "acarbose": "Acarbose dosage",
    "miglitol": "Miglitol dosage",
    "troglitazone": "Troglitazone dosage",
    "tolazamide": "Tolazamide dosage",
    "insulin": "Insulin dosage",
    "glyburide-metformin": "Glyburide-metformin dosage",
    "glipizide-metformin": "Glipizide-metformin dosage",
    "glimepiride-pioglitazone": "Glimepiride-pioglitazone dosage",
    "metformin-rosiglitazone": "Metformin-rosiglitazone dosage",
    "metformin-pioglitazone": "Metformin-pioglitazone dosage",
    "change": "Medication changed this stay",
    "diabetesMed": "Any diabetes medication prescribed",
    "diag_1_group": "Primary diagnosis group",
    "diag_2_group": "Secondary diagnosis group",
    "diag_3_group": "Additional diagnosis group",
    "age_numeric": "Age (bracket midpoint)",
    "age_group": "Age band",
    "total_prior_visits": "Total prior visits",
    "num_med_changes": "Medication dosage changes this stay",
    "num_meds_prescribed": "Diabetes medications prescribed",
}


def label_for(column: str) -> str:
    """Return the plain-English label for a model input column."""
    return LABELS.get(column, column)


def unwrap_pipeline(model: Any) -> Pipeline:
    """Dig the fitted Pipeline out of whatever the artefact is wrapped in.

    train.py saves a CalibratedClassifierCV wrapping a FrozenEstimator wrapping
    the Pipeline. Unwrapping by attribute rather than by asserting the exact
    class chain means a bare Pipeline (an older artefact, or a test double) still
    works instead of raising.
    """
    candidate = model
    for _ in range(5):
        if isinstance(candidate, Pipeline):
            return candidate
        calibrated = getattr(candidate, "calibrated_classifiers_", None)
        if calibrated:
            candidate = calibrated[0].estimator
            continue
        inner = getattr(candidate, "estimator", None)
        if inner is None:
            break
        candidate = inner
    raise TypeError(f"No fitted Pipeline found inside {type(model).__name__}")


def source_columns(preprocessor: Any) -> list[str]:
    """Map every transformed column back to the input column it came from.

    One-hot encoding turns 51 inputs into 206 columns, so a SHAP value per
    transformed column has to be summed back to its source before it means
    anything to a reader. Matching is by longest prefix, which is what separates
    "diag_1_group_Circulatory" (source diag_1_group) from a diag_1 category -
    a plain prefix test would assign both to diag_1.
    """
    inputs = list(preprocessor.feature_names_in_)
    mapped: list[str] = []
    for name in preprocessor.get_feature_names_out():
        body = name.split("__", 1)[1] if "__" in name else name
        best = ""
        for column in inputs:
            if (body == column or body.startswith(f"{column}_")) and len(column) > len(best):
                best = column
        if not best:
            raise ValueError(f"Transformed column {name!r} does not map to any model input")
        mapped.append(best)
    return mapped


def aggregate_by_source(values: np.ndarray, sources: list[str], inputs: list[str]) -> pd.DataFrame:
    """Sum per-column contributions back onto the model's input columns.

    Summing (not averaging) is the right operation: a row's one-hot block for a
    column has exactly one active category, and SHAP values are additive, so the
    block's sum is that column's whole contribution for that row.
    """
    frame = pd.DataFrame(values, columns=sources)
    aggregated = frame.T.groupby(level=0).sum().T
    return aggregated.reindex(columns=inputs, fill_value=0.0)


def _direction(raw_values: pd.Series, contributions: pd.Series) -> str:
    """Say which way a column pushes risk, when that can be said at all.

    For a numeric column the sign of the rank correlation between the value and
    its contribution answers it directly. For a categorical column there is no
    single direction - "race" does not have a high end - so it is reported as
    mixed rather than given a sign it does not have.
    """
    if not pd.api.types.is_numeric_dtype(raw_values):
        return "mixed"
    if raw_values.nunique(dropna=True) < 2 or contributions.nunique() < 2:
        return "mixed"
    correlation = spearmanr(raw_values, contributions).statistic
    if correlation is None or np.isnan(correlation):
        return "mixed"
    return "higher_value_increases_risk" if correlation > 0 else "higher_value_decreases_risk"


def global_drivers(
    contributions: pd.DataFrame, sample: pd.DataFrame, top_n: int
) -> list[dict[str, Any]]:
    """Rank model input columns by their mean absolute contribution."""
    strength = contributions.abs().mean().sort_values(ascending=False)
    drivers = []
    for rank, (column, value) in enumerate(strength.head(top_n).items(), start=1):
        drivers.append(
            {
                "feature": column,
                "label": label_for(column),
                "mean_abs_shap": round(float(value), 6),
                "direction": _direction(sample[column], contributions[column]),
                "rank": rank,
            }
        )
    return drivers


def patient_drivers(
    contributions: pd.DataFrame, encounter_ids: pd.Series, top_n: int
) -> dict[str, list[dict[str, Any]]]:
    """Return each sampled patient's strongest drivers, signed.

    Per-row the sign is unambiguous - a positive contribution pushed this
    patient's risk up - so unlike the global ranking these carry a real
    direction rather than "mixed".
    """
    result: dict[str, list[dict[str, Any]]] = {}
    for position, encounter_id in enumerate(encounter_ids):
        row = contributions.iloc[position]
        top = row.abs().sort_values(ascending=False).head(top_n)
        result[str(encounter_id)] = [
            {
                "feature": column,
                "label": label_for(column),
                "contribution": round(float(row[column]), 6),
                "direction": "increases_risk" if row[column] > 0 else "decreases_risk",
                "rank": rank,
            }
            for rank, column in enumerate(top.index, start=1)
        ]
    return result


def additivity_error(estimator: Any, matrix: Any, values: np.ndarray, expected_value: Any) -> float:
    """Return the largest gap between the SHAP reconstruction and the model margin.

    TreeSHAP is exact, so for every row the expected value plus that row's
    contributions must equal the model's raw margin. Checking it is cheap and it
    is the only thing that catches an explanation computed against a different
    input than the model actually reads - the bug that produced a reversed
    number_inpatient direction on the first run of this file. Compare against the
    margin for the same matrix that was explained, not a converted copy of it,
    or the check measures the conversion instead of the explanation.
    """
    margin = np.asarray(estimator.predict(matrix, output_margin=True), dtype=float)
    reconstructed = float(np.ravel(expected_value)[0]) + values.sum(axis=1)
    return float(np.abs(reconstructed - margin).max())


def model_version(model_path: Path, metrics: dict[str, Any] | None) -> str:
    """Build the same version string the backend reports for this artefact.

    Deliberately a copy of backend/app/services/model_service._read_version
    rather than an import: ml/ and backend/ are separate packages and the ML side
    must not import backend code. If that function changes, this one has to be
    changed to match - the format is "<best model>-<artefact mtime>".
    """
    stamp = datetime.fromtimestamp(model_path.stat().st_mtime, tz=UTC).strftime("%Y%m%d%H%M")
    best = (metrics or {}).get("best_model")
    return f"{best}-{stamp}" if best else stamp


def explain(
    model: Any,
    sample: pd.DataFrame,
    encounter_ids: pd.Series,
    config: dict[str, Any],
    model_version_string: str,
) -> dict[str, Any]:
    """Produce the feature_importance.json payload for a trained model.

    Tries SHAP first and falls back to the tree's own gain importances if it
    raises, recording which one ran. The fallback is genuinely weaker - gain
    importance is global only, so there are no per-patient drivers - and the
    artefact says so rather than shipping a thinner file that looks the same.
    """
    settings = config["explainability"]
    pipeline = unwrap_pipeline(model)
    preprocessor = pipeline.named_steps["preprocess"]
    estimator = pipeline.named_steps["model"]
    inputs = list(preprocessor.feature_names_in_)
    sources = source_columns(preprocessor)

    # The transform output is handed to SHAP exactly as it comes out. Densifying
    # it looks harmless and is not: the ColumnTransformer returns a sparse matrix
    # here, XGBoost reads an absent entry in a sparse matrix as missing and sends
    # it down the tree's default branch, and .toarray() turns that same entry into
    # a real 0.0 that takes the numeric branch instead. Measured on this artefact
    # the two disagree by up to 0.65 in predicted probability, which was enough to
    # reverse the reported direction of number_inpatient - SHAP was faithfully
    # explaining a function the model had never been.
    transformed = preprocessor.transform(sample)

    method = SHAP_METHOD
    additivity: float | None = None
    note = (
        "SHAP explains the uncalibrated XGBoost margin. Isotonic calibration is "
        "monotonic, so the ranking and the sign of each driver hold for the "
        "calibrated probability; the absolute magnitudes do not. Drivers are "
        "associations, not causes."
    )
    try:
        import shap

        explainer = shap.TreeExplainer(estimator)
        values = np.asarray(explainer.shap_values(transformed))
        additivity = additivity_error(estimator, transformed, values, explainer.expected_value)
        contributions = aggregate_by_source(values, sources, inputs)
    except Exception as error:  # noqa: BLE001 - any SHAP failure must fall back, not crash
        method = FALLBACK_METHOD
        note = (
            f"SHAP was unavailable or failed ({type(error).__name__}: {error}). "
            "Fell back to the tree's gain importances, which are global only - "
            "patient_drivers is empty in this run."
        )
        importances = np.asarray(estimator.feature_importances_, dtype=float)
        contributions = aggregate_by_source(importances.reshape(1, -1), sources, inputs)

    if method == SHAP_METHOD:
        patient_count = int(settings["patient_sample_size"])
        drivers = patient_drivers(
            contributions.head(patient_count),
            encounter_ids.iloc[:patient_count],
            int(settings["top_patient_drivers"]),
        )
        ranked = global_drivers(contributions, sample, int(settings["top_global_drivers"]))
    else:
        drivers = {}
        ranked = [
            {
                "feature": column,
                "label": label_for(column),
                "mean_abs_shap": None,
                "gain_importance": round(float(value), 6),
                "direction": "mixed",
                "rank": rank,
            }
            for rank, (column, value) in enumerate(
                contributions.iloc[0]
                .sort_values(ascending=False)
                .head(int(settings["top_global_drivers"]))
                .items(),
                start=1,
            )
        ]

    return {
        "schema_version": "1.0",
        "model_version": model_version_string,
        "generated_at": datetime.now(tz=UTC).isoformat(),
        "method": method,
        "method_note": note,
        "additivity_max_error": additivity,
        "sample": {
            "rows_explained": int(len(sample)),
            "patients_with_drivers": len(drivers),
            "drawn_from": "held-out test split, reproduced from config split settings",
            "note": (
                "patient_drivers covers a sample only. Full per-patient drivers "
                "should be computed on demand, not shipped in this file."
            ),
        },
        "global_drivers": ranked,
        "patient_drivers": drivers,
    }
