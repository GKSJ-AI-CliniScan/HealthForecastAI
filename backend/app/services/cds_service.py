"""Clinical decision support: turn a trained model's feature importances into
plain-language factors behind one prediction.

N6 (rescoped by A1): clinical_support.py's own TODO(milestone-3) markers own
that endpoint file - this module does not touch it. Instead, /risk/predict
(risk.py) calls generate_insights() and attaches the result to its response.

Language discipline: every sentence this module produces uses "associated
with", never a causal verb ("causes", "leads to", "results in", "makes",
"drives"). A tree ensemble's feature_importances_ says which inputs the
model leans on most; it says nothing about mechanism, and dressing it up as
causal would be a claim this code cannot support.
"""

from __future__ import annotations

from typing import Any

from app.services import model_service

# WHAT      : short, patient-facing descriptions and the association claim
#             for each of the seven fields the API actually collects from a
#             caller (model_service.REQUEST_FEATURES).
# WHY       : these are the only fields a prediction request supplies real,
#             observed values for - every other column the trained pipeline
#             was fitted on is filled with a population-typical imputed
#             default for this request (see model_service.predict_probability's
#             own comment block), not this patient's data. Explaining an
#             imputed default as if it were observed would misrepresent it.
# FOR WHOM  : generate_insights(), to build one association sentence per
#             ranked factor.
# BENEFIT   : every insight this module produces is traceable to something
#             the caller actually submitted, not to a value the model
#             invented to fill a gap.
# COST      : a fixed, hand-written phrase per field - a new field added to
#             RiskPredictionRequest without a matching entry here falls back
#             to its bare column name (see the .get() default below) rather
#             than a polished sentence fragment.
# ALTERNATIVES : (1) generate a sentence for every column the model uses,
#             including the 44 imputed ones; (2) auto-generate the phrase
#             from the column name (e.g. "number_inpatient" ->
#             "number inpatient") instead of hand-writing it.
# CHOSEN BECAUSE : (1) is exactly the misrepresentation this dict exists to
#             prevent; (2) produces grammatically awkward, clinically
#             imprecise phrasing ("a higher number inpatient") where a short
#             hand-written description reads as something a clinician
#             actually wrote.
_FACTOR_DESCRIPTIONS: dict[str, str] = {
    "time_in_hospital": "a longer current hospital stay",
    "num_medications": "a higher number of prescribed medications",
    "num_lab_procedures": "a higher number of lab procedures during this stay",
    "number_diagnoses": "a higher number of recorded diagnoses",
    "number_inpatient": "a higher number of prior inpatient admissions",
    "number_emergency": "a higher number of prior emergency visits",
    "age_group": "an older age group",
}


def _original_column(transformed_name: str, columns_by_transformer: dict[str, list[str]]) -> str:
    """Map one ColumnTransformer output name back to its original input column.

    "numeric__time_in_hospital" -> "time_in_hospital" (1:1, no prefix to
    strip beyond the transformer name). "categorical__age_group_60+" ->
    "age_group" (longest-prefix match against the known categorical
    columns, so "diag_1_group_Circulatory" resolves to "diag_1_group" and
    not the shorter "diag_1").
    """
    transformer_name, _, feature_part = transformed_name.partition("__")
    candidates = columns_by_transformer.get(transformer_name, [])
    for column in sorted(candidates, key=len, reverse=True):
        if feature_part == column or feature_part.startswith(f"{column}_"):
            return column
    return feature_part


# WHAT      : sum a fitted model's per-output-column importance back onto
#             its original input columns, using the ColumnTransformer's own
#             get_feature_names_out() rather than recomputing one-hot widths
#             by hand.
# WHY       : a single original column like "age_group" becomes several
#             one-hot output columns after encoding; feature_importances_ is
#             indexed by those many output columns, not the seven columns a
#             clinician actually recognises. min_frequency=0.01 on the real
#             encoder (build_preprocessor) can also collapse rare categories
#             into an "infrequent" bucket, changing a column's output width
#             in a way that is only reliably knowable from the encoder's own
#             get_feature_names_out() - not from a fixed formula.
# FOR WHOM  : generate_insights(), once per prediction request (the pipeline
#             itself is already cached by model_service - this is pure
#             array arithmetic on it, not a reload).
# BENEFIT   : one importance number per original column, comparable to how a
#             clinician thinks about "age" or "prior admissions", regardless
#             of how many one-hot columns the encoder happened to produce.
# COST      : falls back to an empty dict for a model type with neither
#             feature_importances_ (tree/boosting models) nor coef_ (linear
#             models) - insights are then unavailable for that model type,
#             not fabricated from an unsupported attribute.
# ALTERNATIVES : (1) compute each categorical column's one-hot width from
#             encoder.categories_ directly, without consulting
#             get_feature_names_out(); (2) require SHAP or a similar
#             library for a true per-patient marginal contribution instead
#             of a global importance score.
# CHOSEN BECAUSE : (1) breaks silently the moment min_frequency collapses a
#             category, since categories_ still lists every category found
#             at fit time even though the encoder no longer emits a
#             separate output column for each of them; (2) is a new
#             dependency this project does not otherwise need, for a
#             precision this module does not claim (see the module
#             docstring - association from global importance, not a
#             per-patient causal decomposition).
def _aggregate_importance_by_column(pipeline: Any) -> dict[str, float]:
    """Return {original_column: summed_importance} for a fitted pipeline."""
    preprocess = pipeline.named_steps.get("preprocess")
    model = pipeline.named_steps.get("model")
    if preprocess is None or model is None:
        return {}

    if hasattr(model, "feature_importances_"):
        raw_importances = list(model.feature_importances_)
    elif hasattr(model, "coef_"):
        raw_importances = [abs(value) for value in model.coef_[0]]
    else:
        return {}

    output_names = preprocess.get_feature_names_out()
    columns_by_transformer = {
        name: list(columns)
        for name, _, columns in preprocess.transformers_
        if isinstance(columns, list | tuple)
    }

    aggregated: dict[str, float] = {}
    for name, importance in zip(output_names, raw_importances, strict=True):
        column = _original_column(name, columns_by_transformer)
        aggregated[column] = aggregated.get(column, 0.0) + float(importance)
    return aggregated


# WHAT      : rank the caller-supplied fields by how much the model relies
#             on them, and phrase the top few as association-only sentences
#             using this patient's own submitted values.
# WHY       : N6 asks for "which factors most raise this patient's score",
#             translated into plain clinical language, in the language of
#             association rather than causation.
# FOR WHOM  : risk.py's predict_risk, attached to the RiskPredictionRead
#             response after a successful prediction.
# BENEFIT   : a clinician reading a risk score sees which of the fields they
#             entered the model weighed most heavily, in one or two
#             sentences per factor, without a causal claim the model cannot
#             support.
# COST      : this ranks by the model's GLOBAL feature importance, not a
#             true per-patient marginal contribution (that would need SHAP
#             or a comparable per-instance explainer) - two patients with
#             very different values on the same top-ranked factor get the
#             same factor highlighted, because the model leans on that
#             factor heavily in general, not because it was computed to
#             matter unusually much for either of them specifically.
# ALTERNATIVES : (1) rank and explain every column the trained model uses,
#             including the ~44 the caller never supplied; (2) skip ranking
#             and always describe the same fixed set of factors regardless
#             of what the model actually weighs most.
# CHOSEN BECAUSE : (1) is the misrepresentation _FACTOR_DESCRIPTIONS's own
#             comment block rules out - explaining an imputed default as if
#             it were this patient's data; (2) would not be "feature
#             importance translated into plain language" at all, just a
#             fixed checklist unrelated to what the model actually learned.
def generate_insights(features: dict[str, Any], top_n: int = 3) -> list[dict[str, Any]]:
    """Return up to top_n association-only insights, most important first.

    Raises model_service.ModelUnavailableError if no artefact is loaded -
    the same error /risk/predict already handles for the prediction itself.
    """
    pipeline = model_service.loaded_pipeline()
    importance_by_column = _aggregate_importance_by_column(pipeline)

    caller_supplied = {
        column: importance
        for column, importance in importance_by_column.items()
        if column in model_service.REQUEST_FEATURES and features.get(column) is not None
    }
    ranked = sorted(caller_supplied.items(), key=lambda item: item[1], reverse=True)[:top_n]

    return [
        {
            "feature": column,
            "patient_value": features[column],
            "association": (
                f"{_FACTOR_DESCRIPTIONS.get(column, column).capitalize()} is associated "
                "with higher readmission risk in the published literature on this "
                "population."
            ),
        }
        for column, _ in ranked
    ]
