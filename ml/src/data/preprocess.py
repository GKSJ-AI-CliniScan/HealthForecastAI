"""Cleaning and preprocessing steps shared by training and inference.

The cleaning decisions follow Strack et al. (2014), the paper published with the
Diabetes 130-US Hospitals dataset. Each step is a separate function so that the
reasoning behind it is testable and reviewable on its own.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

# Discharge dispositions meaning the patient died or entered hospice care.
# These encounters cannot result in a readmission, so leaving them in the
# training data would corrupt the target variable.
DEATH_OR_HOSPICE_DISPOSITIONS = (11, 13, 14, 19, 20, 21)

# Midpoint of each age bracket, so the bracket can be used as a numeric feature.
AGE_MIDPOINTS = {
    "[0-10)": 5,
    "[10-20)": 15,
    "[20-30)": 25,
    "[30-40)": 35,
    "[40-50)": 45,
    "[50-60)": 55,
    "[60-70)": 65,
    "[70-80)": 75,
    "[80-90)": 85,
    "[90-100)": 95,
}

# Columns kept as an explicit "Missing" category rather than dropped or imputed.
# Absence is itself informative here: a blank medical_specialty usually means
# the admission was not routed to a specialist.
MISSING_AS_CATEGORY = ("medical_specialty", "race", "diag_1", "diag_2", "diag_3")

MISSING_LABEL = "Missing"

# ICD-9 chapter ranges used to collapse ~850 raw diagnosis codes into groups a
# model can actually learn from.
ICD9_GROUPS: tuple[tuple[str, float, float], ...] = (
    ("Circulatory", 390, 459),
    ("Respiratory", 460, 519),
    ("Digestive", 520, 579),
    ("Injury", 800, 999),
    ("Musculoskeletal", 710, 739),
    ("Genitourinary", 580, 629),
    ("Neoplasms", 140, 239),
)

# Single codes that belong with a chapter above despite sitting outside its range.
ICD9_SINGLE_CODES = {785: "Circulatory", 786: "Respiratory", 787: "Digestive", 788: "Genitourinary"}


def drop_unused_columns(frame: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop identifier and high-missingness columns listed in the config."""
    present = [column for column in columns if column in frame.columns]
    return frame.drop(columns=present)


def split_feature_types(frame: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Return the numeric and categorical column names of a dataframe."""
    numeric = frame.select_dtypes(include=["number"]).columns.tolist()
    categorical = [column for column in frame.columns if column not in numeric]
    return numeric, categorical


def drop_constant_columns(frame: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Remove columns holding a single value, which carry no information."""
    constant = [column for column in frame.columns if frame[column].nunique(dropna=False) <= 1]
    return frame.drop(columns=constant), constant


def fill_missing_as_category(frame: pd.DataFrame) -> pd.DataFrame:
    """Replace missing values with an explicit category where absence is meaningful.

    The result is cast to string. ICD-9 diagnosis codes mix numeric values like
    250.83 with alphanumeric ones like V57, so pandas reads the column as object
    holding both floats and strings. Filling the gaps without casting leaves that
    mix in place, and scikit-learn's OneHotEncoder rejects a column that is not
    uniformly strings or numbers.
    """
    filled = frame.copy()
    for column in MISSING_AS_CATEGORY:
        if column in filled.columns:
            filled[column] = filled[column].fillna(MISSING_LABEL).astype(str)
    return filled


def remove_death_and_hospice(frame: pd.DataFrame) -> pd.DataFrame:
    """Drop encounters that ended in death or hospice transfer.

    These patients cannot be readmitted. Keeping them would teach the model that
    a whole class of high-risk patients never returns.
    """
    if "discharge_disposition_id" not in frame.columns:
        return frame
    mask = ~frame["discharge_disposition_id"].isin(DEATH_OR_HOSPICE_DISPOSITIONS)
    return frame[mask]


def keep_first_encounter_per_patient(frame: pd.DataFrame) -> pd.DataFrame:
    """Keep one row per patient so that observations are statistically independent.

    A patient with several admissions would otherwise appear in both the training
    and the test split, which inflates every evaluation metric.
    """
    if "patient_nbr" not in frame.columns:
        return frame
    ordered = frame.sort_values("encounter_id") if "encounter_id" in frame.columns else frame
    return ordered.drop_duplicates(subset="patient_nbr", keep="first")


def decode_id_columns(frame: pd.DataFrame, mappings: dict[str, dict[int, str]]) -> pd.DataFrame:
    """Turn the three coded identifier columns into readable categories."""
    decoded = frame.copy()
    targets = {
        "admission_type_id": "admission_type",
        "discharge_disposition_id": "discharge_disposition",
        "admission_source_id": "admission_source",
    }
    unavailable = {"NULL": "Not Available", "Not Mapped": "Not Available"}
    for id_column, name in targets.items():
        if id_column not in decoded.columns or id_column not in mappings:
            continue
        decoded[name] = decoded[id_column].map(mappings[id_column]).fillna("Not Available")
        decoded[name] = decoded[name].replace(unavailable)
    return decoded


def group_icd9_code(code: object) -> str:
    """Map a single ICD-9 diagnosis code to its clinical group."""
    text = str(code)
    if text == MISSING_LABEL:
        return MISSING_LABEL
    if text.startswith(("V", "E")):
        return "Other"
    try:
        value = float(text)
    except ValueError:
        return "Other"
    if 250 <= value < 251:
        return "Diabetes"
    single = ICD9_SINGLE_CODES.get(int(value))
    if single is not None:
        return single
    for label, low, high in ICD9_GROUPS:
        if low <= value <= high:
            return label
    return "Other"


def add_diagnosis_groups(frame: pd.DataFrame) -> pd.DataFrame:
    """Add a grouped column for each of the three diagnosis fields."""
    grouped = frame.copy()
    for column in ("diag_1", "diag_2", "diag_3"):
        if column in grouped.columns:
            grouped[f"{column}_group"] = grouped[column].map(group_icd9_code)
    return grouped


def add_age_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Convert the age bracket into a numeric midpoint and a three-band group."""
    aged = frame.copy()
    if "age" not in aged.columns:
        return aged
    aged["age_numeric"] = aged["age"].map(AGE_MIDPOINTS)
    aged["age_group"] = pd.cut(
        aged["age_numeric"],
        bins=[0, 30, 60, 100],
        labels=["<30", "30-60", "60+"],
        right=False,
    ).astype(str)
    return aged


def basic_clean(frame: pd.DataFrame, config: dict[str, Any]) -> pd.DataFrame:
    """Apply the configured cleaning steps in order.

    Order matters: rows are removed before deduplication so that the surviving
    encounter per patient is a valid one, and identifier columns are decoded
    before they are dropped.
    """
    preprocessing = config.get("preprocessing", {})
    cleaning = config.get("cleaning", {})

    cleaned = frame.copy()
    cleaned = drop_unused_columns(cleaned, cleaning.get("drop_columns", []))
    cleaned, _ = drop_constant_columns(cleaned)
    cleaned = fill_missing_as_category(cleaned)

    if "gender" in cleaned.columns:
        cleaned = cleaned.dropna(subset=["gender"])

    if cleaning.get("remove_death_and_hospice", True):
        cleaned = remove_death_and_hospice(cleaned)
    if cleaning.get("first_encounter_only", True):
        cleaned = keep_first_encounter_per_patient(cleaned)

    cleaned = add_diagnosis_groups(cleaned)
    cleaned = add_age_features(cleaned)

    # Kept for compatibility with the scaffold's original contract.
    legacy_drop = preprocessing.get("drop_columns", [])
    if cleaning.get("apply_legacy_drop", False):
        cleaned = drop_unused_columns(cleaned, legacy_drop)

    return cleaned.drop_duplicates()
