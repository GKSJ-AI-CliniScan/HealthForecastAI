# ML insights contract v1.0

What the ML side produces for the backend, and how to read it.

Frozen on 2026-09-19 by the ML side (Teammate 3) because Teammate 2 could not be
reached. It is a starting point written down, not an agreement - raise anything
that does not fit and it can change, through a `schema_version` bump.

- Producer: `ml/src/evaluation/treatment_report.py`
- Artefacts: `ml/artifacts/treatment_metrics.json`, `ml/artifacts/feature_importance.json`
- Read them through `ml/src/serving/insights_loader.py`. Do not parse the files
  directly - the loader is where the version check lives.

## Rules that apply to everything below

1. **Both files carry `"schema_version": "1.0"`.** The loader checks it on load
   and raises `SchemaVersionError` if it does not match. A shape change means a
   new version number, not a quiet edit.
2. **Nothing here is causal.** Every rate difference is an association between
   groups that were never randomised. Patients whose medication changed were
   changed because they were sicker. Endpoint copy must not say a treatment
   "reduces" or "causes" anything.
3. **No HbA1c improvement is measured anywhere.** The dataset has one
   `A1Cresult` per encounter and no follow-up value. The nearest thing is
   `treatment_effectiveness.factors.a1c_and_medication_change`, which is an
   association between A1C testing, medication change and readmission. Its
   `measures` field says so in text - show that text.
4. **No time trends exist.** The dataset has no admission dates. Do not build a
   trend endpoint on this data.
5. **`reliable: false` means fewer than 30 patients.** Show the row greyed out
   or with a warning; do not hide it. A hidden cohort reads as a cohort with no
   readmissions.

## treatment_metrics.json

```
{
  "schema_version": "1.0",
  "generated_at": "<ISO 8601 UTC>",
  "population": { "rows": 69987, "description": "..." },
  "recovery_score": {
    "version": "1.0",
    "definition": "<text - safe to show verbatim>",
    "scored_rows": 69987, "unscored_rows": 0,
    "mean": 73.45, "median": 78.85,
    "percentiles": { "p10": ..., "p25": ..., "p75": ..., "p90": ... }
  },
  "treatment_effectiveness": { "factors": {...}, "medications": {...} },
  "cohorts": { "age": [...], "gender": [...], "race": [...], "diagnosis": [...] },
  "model_evaluation": {...},
  "limitations": [ "<string>", ... ]
}
```

### Recovery score

0-100, higher is better. Defined in `ml/configs/config.yaml` under
`recovery_score`: `readmitted` 50%, `time_in_hospital` 25%, `A1Cresult` 25%.
When a component is missing the remaining weights are re-normalised, so a
patient with no A1C result is scored on the other two rather than penalised for
a test nobody ordered. A patient with no component at all scores `null`, which
means "not known" and must not be rendered as 0.

### A group entry

Every group inside `treatment_effectiveness` has the same shape:

| Field | Meaning |
|---|---|
| `value` | the group, e.g. `"Ch"`, `"Up"`, `"tested"` |
| `n` | patients in the group |
| `readmitted_30d` | how many were readmitted within 30 days |
| `rate_30d` | `readmitted_30d / n` |
| `ci_95_30d` | `[low, high]` Wilson 95% interval for `rate_30d` |
| `readmitted_any` / `rate_any` / `ci_95_any` | the same for any readmission (`<30` or `>30`) |
| `reliable` | `false` when `n < 30` |

Each factor also carries `chi_square_30d` with `p_value` and `statistic`, or
`p_value: null` and a `note` when the table was too small to test.

**Use the interval, not just the rate.** Two groups whose `ci_95_30d` ranges
overlap have not been shown to differ. `factors.change` is a worked example: the
30-day rate is 0.0944 when medication changed against 0.0860 when it did not,
p = 0.000127 - statistically separable on ~70,000 patients, and still a gap of
under one point that says nothing about cause.

`factors` holds `change`, `diabetesMed`, `a1c_tested` and
`a1c_and_medication_change`. `medications` holds one entry per drug keyed by
column name (`insulin`, `metformin`, ...), grouped over `Up`/`Down`/`Steady`/`No`.
Most drugs are `No` for nearly every patient, so `reliable` matters most here.

### Cohorts

`cohorts.<type>` is a list, one entry per group, for `age`, `gender`, `race`,
`diagnosis`. Fields: `cohort`, `n`, `readmitted_30d`, `rate_30d`, `ci_95_30d`,
`rate_any`, `mean_recovery_score`, `scored_rows`, `reliable`.

`diagnosis` uses the primary diagnosis mapped from ICD-9: `circulatory`,
`respiratory`, `digestive`, `diabetes`, `injury`, `musculoskeletal`,
`genitourinary`, `neoplasms`, `other`, plus `missing` for encounters with no
primary diagnosis recorded. `missing` is a data gap, not a clinical group.

### model_evaluation

`roc_auc`, `recall`, `precision` at the shipped `decision_threshold`,
`test_rows`, and a `calibration` block (`bins`, `brier_score`,
`expected_calibration_error`, `mean_predicted_probability`,
`observed_prevalence`).

These are **offline** numbers on the full 51-column feature set. The API supplies
7 of those 51 per request and imputes the rest, which costs roughly 0.06 ROC-AUC
and most of the recall - see `ml/artifacts/a16_serving_fidelity.json`. Do not
publish the offline numbers as the API's accuracy.

## feature_importance.json

```
{
  "schema_version": "1.0",
  "model_version": "xgboost-202609051057",
  "generated_at": "<ISO 8601 UTC>",
  "method": "shap_tree_explainer" | "xgboost_feature_importances",
  "method_note": "<text>",
  "additivity_max_error": 8.3e-07,
  "sample": { "rows_explained": 2000, "patients_with_drivers": 200, ... },
  "global_drivers": [
    { "feature": "number_inpatient", "label": "Previous inpatient visits",
      "mean_abs_shap": 0.08968,
      "direction": "higher_value_increases_risk", "rank": 2 }
  ],
  "patient_drivers": {
    "<encounter_id>": [
      { "feature": "...", "label": "...", "contribution": -0.29,
        "direction": "decreases_risk", "rank": 1 }
    ]
  }
}
```

- `model_version` is the same string `model_service.model_version()` returns, so
  a response can state which artefact explained it.
- `direction` on a **global** driver is `higher_value_increases_risk`,
  `higher_value_decreases_risk`, or `mixed`. `mixed` is every categorical column -
  race has no high end - so render those without a direction arrow.
- `direction` on a **patient** driver is `increases_risk` or `decreases_risk`,
  which is unambiguous because it is the sign of that patient's contribution.
- `additivity_max_error` should be near zero (1e-6 or smaller). It is the largest
  gap between the SHAP reconstruction and the model's own margin. If it is large,
  the explanation does not match the model and should not be shown.
- `method` falls back to `xgboost_feature_importances` if SHAP fails. In that
  case `patient_drivers` is `{}` and `mean_abs_shap` is `null` - check `method`
  before promising per-patient explanations.
- SHAP explains the uncalibrated XGBoost margin. Isotonic calibration is
  monotonic, so ranking and sign carry over to the calibrated probability; the
  absolute magnitudes do not. Do not present a contribution as "this added 3% to
  the risk".
- `patient_drivers` covers a **sample** of patients (200 by default), not
  everyone. A miss is normal. Full per-patient drivers should be computed on
  demand from the model rather than shipped in this file, which would otherwise
  grow past the repository's 5 MB limit.

## Using the loader

```python
from src.serving import insights_loader

insights_loader.get_global_drivers(top_n=10)
insights_loader.get_patient_drivers(encounter_id, top_n=5)   # None if not sampled
insights_loader.get_treatment_summary()
insights_loader.get_cohort_metrics("age")                    # age|gender|race|diagnosis
```

Raises `InsightsUnavailableError` if the artefact has not been generated,
`SchemaVersionError` on a version mismatch, and `ValueError` for an unknown
cohort type. Parsed files are cached in the module; `reset_cache()` clears it.

## How the endpoints should use it

Neither endpoint exists yet and no backend code was written for them - this is
the suggested shape only.

### GET /api/v1/treatment

Return `get_treatment_summary()`, and `get_cohort_metrics(type)` when the caller
asks for a breakdown. Suggested:

- `GET /api/v1/treatment` -> the summary
- `GET /api/v1/treatment/cohorts/{cohort_type}` -> one cohort list, 400 on an
  unknown type

Pass `limitations` through to the response. If `InsightsUnavailableError` is
raised, return 503 with its message - the same shape `model_service` already uses
for a missing model artefact, never a zero or an empty table that reads as real.

### GET /api/v1/recommendations/{patient_id}

1. Resolve the patient to their encounter id.
2. `drivers = get_patient_drivers(encounter_id)`.
3. If it is `None`, fall back to `get_global_drivers(5)` and mark the response so
   the UI can say these are population-level, not this patient's.
4. Phrase each driver from its `label`, in association-only language. The
   existing `cds_service.generate_insights` wording is the precedent -
   "associated with higher readmission risk", never a causal verb.
5. Include `model_version` so a recommendation can be traced to an artefact.

RBAC is unchanged by any of this: these endpoints return patient-linked
information, so they need the verified-permission dependency
(`require_any_verified_permission`), not the cheap JWT-only one.
