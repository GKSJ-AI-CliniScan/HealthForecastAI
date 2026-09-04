"""Feature construction for the readmission model.

These features are derived during Milestone 1 so that Milestone 2 modelling can
start from a table that already carries the strongest known signals from the
readmission literature: prior utilisation and medication instability.

``build_preprocessor`` and ``add_utilisation_features`` are the scaffold's
original contract and are still imported by ``src/models/train.py``. They are
kept here unchanged so the training entrypoint keeps working alongside the
Milestone 1 additions below.
"""

from __future__ import annotations

from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from src.data.preprocess import split_feature_types

# Every drug column in this dataset uses the same four-value dosage vocabulary.
DOSAGE_VALUES = frozenset({"No", "Up", "Down", "Steady"})

PRIOR_VISIT_COLUMNS = ("number_outpatient", "number_emergency", "number_inpatient")


def build_preprocessor(frame: pd.DataFrame, config: dict[str, Any]) -> ColumnTransformer:
    """Build the fitted-at-train-time preprocessing pipeline.

    Returning a ColumnTransformer (rather than transforming in place) keeps
    training and serving consistent - the same object is pickled with the model.
    """
    preprocessing = config.get("preprocessing", {})
    numeric, categorical = split_feature_types(frame)

    numeric_steps: list[tuple[str, Any]] = [
        ("impute", SimpleImputer(strategy=preprocessing.get("numeric_imputation", "median")))
    ]
    if preprocessing.get("scale_numeric", True):
        numeric_steps.append(("scale", StandardScaler()))

    categorical_steps: list[tuple[str, Any]] = [
        (
            "impute",
            SimpleImputer(strategy=preprocessing.get("categorical_imputation", "most_frequent")),
        ),
        ("encode", OneHotEncoder(handle_unknown="ignore", min_frequency=0.01)),
    ]

    return ColumnTransformer(
        transformers=[
            ("numeric", Pipeline(numeric_steps), numeric),
            ("categorical", Pipeline(categorical_steps), categorical),
        ],
        remainder="drop",
    )


def add_utilisation_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Derive prior-utilisation features, the strongest readmission signal.

    Retained under its original name because ``src/models/train.py`` imports it.
    ``add_prior_visit_features`` below is the Milestone 1 equivalent.
    """
    result = frame.copy()
    utilisation_columns = ["number_outpatient", "number_emergency", "number_inpatient"]
    if all(column in result.columns for column in utilisation_columns):
        result["prior_visits_total"] = result[utilisation_columns].sum(axis=1)
    return result


def find_medication_columns(frame: pd.DataFrame) -> list[str]:
    """Return the drug columns, identified by their dosage vocabulary.

    Detecting them by content rather than by a hardcoded list means the pipeline
    survives a column being renamed or dropped upstream.
    """
    medication_columns = []
    for column in frame.columns:
        if pd.api.types.is_numeric_dtype(frame[column]):
            continue
        values = {str(value) for value in frame[column].dropna().unique()}
        if values and values <= DOSAGE_VALUES and frame[column].nunique() > 1:
            medication_columns.append(column)
    return medication_columns


def add_prior_visit_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Add the total number of prior outpatient, emergency and inpatient visits."""
    featured = frame.copy()
    present = [column for column in PRIOR_VISIT_COLUMNS if column in featured.columns]
    if present:
        featured["total_prior_visits"] = featured[present].sum(axis=1)
    return featured


def add_medication_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Add counts of prescribed drugs and of dosage changes.

    A dosage moved up or down during the stay is a proxy for an unstable patient,
    which is one of the stronger predictors of an early return.
    """
    featured = frame.copy()
    medication_columns = find_medication_columns(featured)
    if not medication_columns:
        return featured
    featured["num_med_changes"] = featured[medication_columns].isin(["Up", "Down"]).sum(axis=1)
    featured["num_meds_prescribed"] = featured[medication_columns].ne("No").sum(axis=1)
    return featured


# WHAT      : add two utilisation features beyond the simple visit-count sum
#             already computed by add_prior_visit_features - a ratio of
#             inpatient to outpatient visits, and an interaction between
#             inpatient visit count and length of stay.
# WHY       : N3 lever 2. A raw sum treats an outpatient checkup and an
#             inpatient admission as interchangeable; the ratio captures
#             whether a patient's prior utilisation skewed toward more
#             serious care. The interaction term lets the model learn that
#             a long stay matters more for a patient who was already
#             frequently admitted, not just as two independent effects.
# FOR WHOM  : build_features(), feeding the numeric side of build_preprocessor.
# BENEFIT   : if it lifts CV ROC-AUC, the model gets two more signals a tree
#             cannot always reconstruct on its own from the raw counts
#             (a ratio and a product are not decision-tree-friendly to
#             approximate from splits on the original columns alone).
# COST      : the ratio needs an epsilon to avoid dividing by zero for a
#             patient with no prior outpatient visits, which is arbitrary in
#             magnitude (chosen as +1, a Laplace-style smoothing, not tuned).
# ALTERNATIVES : (1) leave the three raw utilisation counts as they are and
#             let the model (especially a tree ensemble) find any
#             interaction itself; (2) compute the ratio against total prior
#             visits instead of outpatient visits specifically.
# CHOSEN BECAUSE : both are computed from this row's own three columns only
#             (B3: no target, no aggregate over the dataset) - required
#             either way. (1) is exactly the baseline this lever is testing
#             against, via CV, not assumed superior or inferior in advance;
#             (2) would answer a different, less specific question ("how
#             serious relative to all prior care" instead of "how serious
#             relative to routine follow-up specifically").
def add_utilisation_ratio_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Add an inpatient/outpatient ratio and an inpatient x length-of-stay interaction."""
    featured = frame.copy()
    required = ("number_inpatient", "number_outpatient", "time_in_hospital")
    if not all(column in featured.columns for column in required):
        return featured
    featured["inpatient_outpatient_ratio"] = featured["number_inpatient"] / (
        featured["number_outpatient"] + 1
    )
    featured["inpatient_stay_interaction"] = (
        featured["number_inpatient"] * featured["time_in_hospital"]
    )
    return featured


# WHAT      : add a binary flag for whether any medication's dosage changed
#             during the stay, alongside the existing num_med_changes count.
# WHY       : N3 lever 3. The count already exists; a linear model
#             (logistic regression) can only use it proportionally, but the
#             clinically meaningful distinction may be "changed at all"
#             versus "how many" - a single dosage adjustment and five may
#             both simply mean "this patient's regimen was unstable".
# FOR WHOM  : build_features(), called after add_medication_features so
#             num_med_changes already exists to threshold.
# BENEFIT   : gives a linear model direct access to a binary "unstable
#             regimen" signal it would otherwise have to approximate from a
#             count's magnitude.
# COST      : redundant with num_med_changes for any model that can already
#             represent a threshold on a count (a tree splits on
#             num_med_changes > 0 for free) - only a linear model stands to
#             gain, and this project's lever selection judges every lever on
#             one model (random_forest), which cannot benefit from this the
#             same way logistic regression would.
# ALTERNATIVES : (1) skip the flag and rely on num_med_changes alone; (2)
#             one-hot the exact change count instead of collapsing it to a
#             binary flag.
# CHOSEN BECAUSE : this is what N3 lever 3 names specifically ("a binary
#             'any dosage changed' flag"), and (2) would reintroduce the
#             count as several sparse columns instead of the single
#             interpretable flag N3 asks for. Derived from this row's own
#             already-computed count column only (B3).
def add_any_medication_change_flag(frame: pd.DataFrame) -> pd.DataFrame:
    """Add a binary flag for whether any medication's dosage changed this stay."""
    featured = frame.copy()
    if "num_med_changes" not in featured.columns:
        return featured
    featured["any_med_change"] = (featured["num_med_changes"] > 0).astype(int)
    return featured


# WHAT      : replace the raw, continuous number_diagnoses count with an
#             ordinal bin index (0-3), reducing 17 distinct integer values
#             to 4 clinically-grouped bands.
# WHY       : N3 lever 4a. A raw count of 1 versus 2 diagnoses is unlikely
#             to carry a meaningfully different risk on its own, but 3
#             diagnoses versus 12 does; binning trades precision noise for a
#             coarser, more stable signal on a feature this skewed.
# FOR WHOM  : build_features(), replacing number_diagnoses as a numeric
#             input to build_preprocessor.
# BENEFIT   : if it lifts CV ROC-AUC, a tree ensemble has fewer, more
#             separated split points to choose among for this feature
#             instead of 17 nearly-adjacent integer thresholds.
# COST      : bin edges (1-3, 4-6, 7-9, 10+) are a judgment call, not fit
#             from the data - a different choice could bin differently.
#             Binning also throws away information a model that could use
#             the raw count well would lose access to.
# ALTERNATIVES : (1) leave number_diagnoses as the raw count; (2) bin it
#             into quartiles fit from the training data's own distribution
#             instead of fixed, judgment-call edges.
# CHOSEN BECAUSE : (1) is exactly the baseline this lever tests against via
#             CV; (2) would make the bin edges a statistic learned from
#             training data, which is still legitimate (not target-derived,
#             B3 is only about the target) but adds a fitted parameter this
#             project's Pipeline discipline would need to carry alongside
#             the ColumnTransformer - fixed clinical-judgment edges keep the
#             transform stateless and identical between train and serving.
def bin_number_diagnoses(frame: pd.DataFrame) -> pd.DataFrame:
    """Replace number_diagnoses with an ordinal bin index (0-3)."""
    featured = frame.copy()
    if "number_diagnoses" not in featured.columns:
        return featured
    featured["number_diagnoses_binned"] = (
        pd.cut(
            featured["number_diagnoses"],
            bins=[0, 3, 6, 9, featured["number_diagnoses"].max() + 1],
            labels=[0, 1, 2, 3],
            right=False,
        )
        .astype("float")
        .astype("Int64")
    )
    return featured.drop(columns=["number_diagnoses"])


# WHAT      : drop the raw diag_1/diag_2/diag_3 high-cardinality ICD-9 codes,
#             keeping only the clinical-group columns preprocess.py already
#             derives from them (diag_1_group, diag_2_group, diag_3_group).
# WHY       : N3 lever 1. ~700-900 distinct raw codes per column, one-hot
#             encoded, is exactly the kind of high-cardinality sparsity that
#             invites overfitting on a dataset this size; the clinical
#             grouping (Strack et al.'s categories) collapses that to under
#             ten groups per column.
# FOR WHOM  : build_features(), as the last step before the frame is handed
#             to train.py's feature/target split.
# BENEFIT   : if it lifts CV ROC-AUC, a much smaller one-hot block for the
#             three diagnosis columns, with fewer opportunities for the
#             model to memorise a rare code seen only a handful of times.
# COST      : the raw code carries information the seven-category grouping
#             cannot - two circulatory codes can differ enormously in
#             severity, and that distinction is gone once both map to
#             "Circulatory".
# ALTERNATIVES : (1) keep both the raw code and the group, letting the
#             preprocessor's OneHotEncoder(min_frequency=0.01) collapse rare
#             raw codes into an "infrequent" bucket on its own; (2) drop the
#             group and keep only the raw code.
# CHOSEN BECAUSE : (1) is the P3 baseline this lever tests against via CV -
#             not assumed worse in advance; (2) would abandon the grouping
#             work already done in preprocess.py without evidence either
#             signal is more useful. Row-level only, no target or aggregate
#             involved (B3).
def drop_raw_diagnosis_codes(frame: pd.DataFrame) -> pd.DataFrame:
    """Drop diag_1/diag_2/diag_3, keeping only their pre-computed clinical groups."""
    raw_diagnosis_columns = [c for c in ("diag_1", "diag_2", "diag_3") if c in frame.columns]
    return frame.drop(columns=raw_diagnosis_columns)


# WHAT      : drop the raw one-hot age bracket ("age") and the derived
#             three-band age_group category, keeping only age_numeric (the
#             bracket's midpoint) as a single ordinal feature.
# WHY       : N3 lever 4b ("age treated as ordinal rather than one-hot").
#             Readmission risk generally rises with age in a roughly
#             monotonic way; one-hot encoding throws that ordering away and
#             makes the model learn ten independent coefficients (or split
#             points) where one ordinal number could let it learn a single
#             trend.
# FOR WHOM  : build_features(), as the last step before the frame is handed
#             to train.py's feature/target split.
# BENEFIT   : if it lifts CV ROC-AUC, nine fewer one-hot columns and a
#             feature a linear model in particular can use monotonically
#             instead of as unordered categories.
# COST      : a genuinely non-monotonic effect (e.g. a specific bracket
#             behaving unlike its neighbours) would be visible to a
#             one-hot-encoded model and invisible to a single ordinal number.
# ALTERNATIVES : (1) keep both the raw one-hot bracket and age_numeric,
#             letting the model use whichever representation helps; (2)
#             keep age_group (a coarser 3-band one-hot) instead of dropping
#             it too.
# CHOSEN BECAUSE : (1) is the P3 baseline being tested via CV; (2) still
#             one-hot-encodes age, which is exactly what lever 4b asks to
#             move away from ("rather than one-hot") - keeping it would
#             only partially apply the lever. No target or aggregate
#             involved (B3).
def use_ordinal_age_only(frame: pd.DataFrame) -> pd.DataFrame:
    """Drop the one-hot age bracket and age_group, keeping only age_numeric."""
    drop_columns = [c for c in ("age", "age_group") if c in frame.columns]
    return frame.drop(columns=drop_columns)


def build_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Run every Milestone 1 feature step in order."""
    featured = add_prior_visit_features(frame)
    featured = add_medication_features(featured)
    return featured
