# Milestone 3 report - Week 5 & 6 - Treatment Effectiveness Analysis & Healthcare Analytics

- **Intern name:** Kanak Prabhakar
- **Branch:** `intern/11-kanak-prabhakar`
- **Role:** Teammate 3, AI/ML Engineer (Treatment Modeling & Explainability)
- **Submitted on:** 2026-09-19

---

## Scope for this milestone

- Implement treatment evaluation workflows.
- Generate recovery and treatment effectiveness reports.
- Develop medication outcome analysis modules.
- Build healthcare performance dashboards.
- Generate patient outcome analytics reports.
- Develop healthcare trend monitoring tools.

## Evaluation criteria

- Treatment effectiveness analysis and healthcare analytics dashboard implemented.
- Patient outcome reports functional.
- Hospital performance analytics generated successfully.
- Trend monitoring workflows integrated.

---

## Decisions

### 2026-09-19 - schemas frozen as v1 by the ML side

Teammate 2 (Backend / Clinical Decision Support) could not be reached during
this milestone. The analytics work depends on two things that are normally
agreed between us: what a "recovery score" means, and what shape the
explainability output takes. Waiting would have blocked the whole milestone,
so the ML side froze both as v1 and wrote the contract down instead of
leaving it implied:

- The recovery score v1 formula (below) is frozen. Its weights and mappings
  live in `ml/configs/config.yaml` under `recovery_score`, not in code.
- `ml/artifacts/feature_importance.json` and `ml/artifacts/treatment_metrics.json`
  both carry `"schema_version": "1.0"`.
- `docs/ml-insights-contract.md` is the written contract for the backend.
- `ml/src/serving/insights_loader.py` is a read-only loader the backend can
  call, so the backend never has to parse these files itself.

Later changes go through `config.yaml` (for values) and `schema_version` (for
shape). A shape change means bumping `schema_version`; the loader checks it on
load and raises rather than silently returning fields the caller does not
expect. This is a decision made under absence, not an agreement - it should be
reviewed with Teammate 2 when they are reachable.

### Recovery score v1

A 0-100 score where higher is better. Three components, each mapped to a 0.0-1.0
value and then weighted:

| Component | Weight | Mapping |
|---|---|---|
| `readmitted` | 0.50 | `NO` -> 1.0, `>30` -> 0.5, `<30` -> 0.0 |
| `time_in_hospital` | 0.25 | shorter is better; min-max normalised over a fixed 1-14 day range, so `1 - (days - 1) / (14 - 1)` |
| `A1Cresult` | 0.25 | `Norm` -> 1.0, `>7` -> 0.5, `>8` -> 0.0 |

`score = 100 * sum(weight_i * value_i) / sum(weight_i)`, summed over the
components that are actually present.

Handling of missing parts:

- `A1Cresult` is `None` (the dataset's literal string for "not tested") or
  genuinely missing: that component is dropped and the remaining weights are
  re-normalised, so `readmitted` and `time_in_hospital` become 0.667 and 0.333.
  This matters in practice - `A1Cresult` is "None" for 84,748 of 101,766 raw
  rows, so most rows are scored on two components.
- Any other component missing: same rule, drop and re-normalise.
- No component present at all: the score is `null`, not 0. A 0 would read as
  "worst possible recovery", which is a different claim from "we do not know".
- `time_in_hospital` outside 1-14 is clamped to that range before normalising.

The 1-14 day range is fixed in the config rather than computed from whatever
data is in front of the function. A min-max taken from the current batch would
make the same patient score differently depending on who else was in the batch,
and would not be reproducible between training and serving.

### Limitations that are properties of the dataset, not of this code

These are stated here because the brief asks for analyses this dataset cannot
actually support, and reporting them as if it could would be wrong.

- **No HbA1c improvement can be measured.** The Diabetes 130-US Hospitals
  dataset carries a single `A1Cresult` per encounter. There is no before value
  and no after value, so there is no way to compute a reduction. What is
  reported instead is an association: "A1C tested + medication changed ->
  readmission outcome", which is the question the data can answer. It is not a
  measured HbA1c reduction and is not labelled as one anywhere in the output.
- **No real time-series trends.** There are no admission dates or timestamps in
  the dataset. `encounter_id` orders encounters but carries no calendar
  information, so a "trend over time" would be an ordering artefact, not a
  trend. No month-over-month or quarter-over-quarter output is produced.
- **Everything here is association, never causation.** Patients whose
  medication changed are not a randomised group; they are sicker on average,
  which is why their medication was changed. A higher readmission rate in that
  group is not evidence that changing medication causes readmission. The
  wording throughout the artefacts and this document stays associational.
- **The training population is one row per patient.** `basic_clean` keeps the
  first encounter per patient and drops death/hospice discharges, so cohort
  counts here will not match a raw count over the full CSV.

## Task checklist

- [x] Recovery score v1 driven entirely by `config.yaml`.
- [x] Treatment effectiveness: readmission rates by `change`, `diabetesMed`,
      each medication's Up/Down/Steady/No, and A1C tested vs not tested, each
      with counts, rate, a 95% confidence interval and a chi-square p-value.
- [x] `ml/artifacts/treatment_metrics.json` written.
- [x] SHAP global and per-patient drivers, with human-readable labels.
- [x] `ml/artifacts/feature_importance.json` written.
- [x] Cohort analytics over age, gender, race and primary diagnosis group,
      with small cohorts flagged rather than reported as reliable.
- [x] `ml/src/serving/insights_loader.py` read-only loader for the backend.
- [x] `docs/ml-insights-contract.md` written for the backend.
- [x] Model evaluation metrics (AUC, recall, precision at the chosen
      threshold, calibration check) included in `treatment_metrics.json`.
- [x] Tests for every new module, and the full suite green.

---

## What I built

Everything below is under `ml/`. Nothing in `backend/` or `frontend/` was
touched - those belong to Samarth and Kiruthika.

**Recovery score and treatment effectiveness
(`ml/src/evaluation/treatment.py`, new).** `recovery_score` implements the v1
formula above, reading every weight and mapping from `config.yaml`. The
drop-and-re-normalise behaviour for a missing component is the part worth
reviewing: it is what lets the score mean the same thing for the ~83% of rows
with no A1C result as for the rest. `treatment_effectiveness` computes
readmission rates by treatment factor with a Wilson 95% confidence interval and
a chi-square p-value per factor, so a rate difference over a handful of rows is
visibly not significant instead of being read as a finding.

**Cohort analytics (`ml/src/evaluation/cohorts.py`, new).** Groups by age band,
gender, race and primary diagnosis, reusing `preprocess.group_icd9_code` for the
ICD-9 mapping rather than writing a second copy of it. Every cohort under 30
rows is marked `"reliable": false` and carries a note; nothing is silently
dropped, because an absent cohort is easy to misread as a cohort with no
readmissions.

**Explainability (`ml/src/models/explain.py`, new).** Runs SHAP `TreeExplainer`
on the XGBoost stage of the trained pipeline and aggregates the 206 one-hot
columns back to the 51 model input columns, so a driver is named
`number_inpatient` rather than `categorical__diag_2_group_Circulatory`. Falls
back to `feature_importances_` if SHAP fails, and records which method ran in
the artefact.

**Backend handoff (`ml/src/serving/insights_loader.py`, new, read-only).** Four
functions the backend can call without knowing the JSON layout, each checking
`schema_version` on load and caching the parsed file.

**Evaluation metrics (`ml/src/evaluation/metrics.py`, extended).**
`threshold_metrics` reports AUC, recall and precision at the pipeline's chosen
decision threshold, and `calibration_check` bins predicted probability against
observed rate so the calibration fix from Milestone 2 can be re-checked rather
than assumed to still hold.

**Config (`ml/configs/config.yaml`, extended).** New `recovery_score`,
`treatment_analysis` and `cohorts` blocks. No weight, mapping, threshold or
minimum cohort size is hardcoded in Python.

## How to run it

The ML environment is `backend/.venv` (Python 3.11.16, scikit-learn 1.6.0).
This matters: the saved model was pickled with scikit-learn 1.6.0 and a newer
system interpreter will not load it.

```bash
git clone <repo-url>
cd HealthForecastAI
git checkout intern/11-kanak-prabhakar

# the raw dataset is never committed - see ml/data/README.md
# ml/data/raw/diabetic_data.csv must exist before the next step

cd ml
../backend/.venv/bin/python -m src.evaluation.treatment_report   # writes both artefacts
../backend/.venv/bin/python -m pytest tests -v
../backend/.venv/bin/python -m ruff check .
../backend/.venv/bin/python -m black --check .
```

`shap` is listed in `ml/requirements.txt` but was not present in the venv; it
was installed as `shap==0.46.0` with numpy, scipy, scikit-learn, xgboost and
pandas held at their existing versions so the pickled model still loads.

## Evidence

### The SHAP bug this milestone found and fixed

The first run of `explain.py` densified the transformed matrix before handing it
to SHAP. The output looked fine - SHAP's own additivity check passed - but the
top drivers were `diag_1`, `medical_specialty` and `diag_3`, and
`number_inpatient` was reported as **reducing** readmission risk. That last one
contradicts the data, so I checked the model directly instead of trusting the
explanation.

Sweeping `number_inpatient` through the pipeline over 500 real test rows, holding
everything else fixed:

```
number_inpatient=0: mean P(readmit<30) = 0.4460
number_inpatient=1: mean P(readmit<30) = 0.5259
number_inpatient=2: mean P(readmit<30) = 0.5858
number_inpatient=3: mean P(readmit<30) = 0.6233
number_inpatient=8: mean P(readmit<30) = 0.6702
```

and the observed 30-day rate in the same test split:

```
number_inpatient  rate    n
0                 0.0806  12369
1                 0.1215   1152
2                 0.2333    300
3                 0.2473     93
5                 0.3333     24
```

Both say the same thing: more prior inpatient visits, more risk. The explanation
said the opposite, so the explanation was wrong.

The cause: `ColumnTransformer` returns a sparse matrix here, and XGBoost reads an
absent entry in a sparse matrix as **missing**, sending it down the tree's default
branch. `.toarray()` turns that same entry into an explicit `0.0`, which takes the
numeric branch. Measured on this artefact:

```
max abs diff sparse vs dense predicted probability: 0.6456
```

So SHAP was explaining a different function from the one that was trained and is
served. The fix is one line - pass the matrix through unchanged. Cross-checked
afterwards against XGBoost's own TreeSHAP (`pred_contribs=True`) on the same
input: **max absolute difference 0.0** across all 206 columns, and additivity
holds to 7e-07.

Top drivers before and after:

| Rank | Before (densified - wrong) | After (correct) |
|---|---|---|
| 1 | diag_1 (mixed) | discharge_disposition_id (raises risk) |
| 2 | medical_specialty (mixed) | number_inpatient (raises risk) |
| 3 | diag_3 (mixed) | time_in_hospital (raises risk) |
| 4 | diag_2 (mixed) | total_prior_visits (raises risk) |
| 5 | diag_1_group (mixed) | age_numeric (raises risk) |

The corrected ranking matches the readmission literature. Two tests now guard it:
`test_densifying_the_matrix_changes_what_the_model_predicts` asserts the sparse
and dense outputs genuinely differ, so nobody re-introduces the densify as a
tidy-up, and `test_prior_inpatient_visits_are_reported_as_raising_risk` pins the
direction in the exported artefact. `explain.py` also writes
`additivity_max_error` into the artefact on every run, which is the check that
would have caught this automatically.

### A second bug, in the calibration check

`calibration_check` built its bins from quantiles of the predicted probabilities.
When every prediction is the same number the quantiles collapse to one edge, so
the function produced **zero bins and an expected calibration error of 0.0** -
reporting perfect calibration for a model that is badly miscalibrated. Found by
`test_calibration_reports_the_gap_when_predictions_are_too_high`, which expected
0.4 and got 0.0. Fixed by falling back to a single bin covering every row.

### Treatment effectiveness, measured

Readmission by whether medication was changed, over 69,987 patients:

| Group | n | 30-day rate | 95% CI | any readmission |
|---|---|---|---|---|
| Changed (`Ch`) | 31,495 | 0.0944 | 0.0912 - 0.0977 | 0.4270 |
| Not changed (`No`) | 38,492 | 0.0860 | 0.0833 - 0.0889 | 0.3913 |

chi-square p = 0.000127. The intervals do not overlap, so the difference is
statistically real on this many patients - and it is still under one percentage
point, and it is **not** evidence that changing medication causes readmission.
Medication is changed for patients who are doing worse.

A1C tested (12,846) against not tested (57,141): 0.0840 and 0.0911. Interval for
tested is 0.0793 - 0.0889, for not tested 0.0888 - 0.0935, so these barely
separate.

## Metrics

Model evaluation on the 13,998-row held-out test split, at the shipped decision
threshold of 0.1117:

| Metric | Value |
|---|---|
| ROC-AUC | 0.6518 |
| Recall | 0.5099 |
| Precision | 0.1454 |
| Brier score | 0.0791 |
| Expected calibration error | 0.0044 |
| Mean predicted probability | 0.0902 |
| Observed prevalence | 0.0898 |

These reproduce `ml/artifacts/metrics.json` to the last digit, which confirms the
split in `treatment_report.py` is the same one `train.py` used rather than a
fresh random split. The calibration numbers confirm Milestone 2's isotonic fix
still holds on the saved artefact: 0.0902 predicted against 0.0898 observed.

**These are offline numbers on all 51 features.** The API supplies 7 and imputes
44, which costs roughly 0.06 ROC-AUC and most of the recall
(`ml/artifacts/a16_serving_fidelity.json`). Do not quote the table above as the
API's accuracy.

Recovery score over the same 69,987 patients: mean 73.45, median 78.85,
p10 38.46, p25 58.97, p75 94.87, p90 97.44. Every row scored - `readmitted` and
`time_in_hospital` are never missing in this dataset - and 81.6% (57,141 of
69,987) were scored without the A1C component, because A1C was never tested for
them.

Artefact sizes: `treatment_metrics.json` 47 KB, `feature_importance.json` 196 KB.
Both well under the 5 MB CI limit.

## Verification

Run from `ml/` with `../backend/.venv/bin/python`.

```
$ python -m src.evaluation.treatment_report
Analysis population: 69987 rows, 30-day rate 0.0898
Model evaluation on 13998 held-out rows: 0.6518 ROC-AUC
Wrote treatment_metrics.json
Wrote feature_importance.json using shap_tree_explainer

$ python -m pytest tests
131 passed in 1.71s

$ python -m ruff check .
All checks passed!

$ python -m black --check .
All done!
35 files would be left unchanged.
```

Per file: test_cohorts 24, test_insights_loader 21, test_treatment 19,
test_metrics 17, test_explain 13, test_preprocess 11, test_train 9,
test_serving_skew 7, test_n3_feature_levers 6, test_config 4. The suite was 49
tests before this milestone, so 82 are new.

Repository checks, the same five CI runs:

```
$ python scripts/ci/check_structure.py    Repository structure: OK (0 warning(s)).
$ python scripts/ci/check_syntax.py       File syntax validation: OK (0 warning(s)).
$ python scripts/ci/check_secrets.py      Secret scan: OK (0 warning(s)).
$ python scripts/ci/check_milestones.py   Milestone reports: OK (0 warning(s)).
$ python scripts/ci/check_branch.py intern/11-kanak-prabhakar
                                          Branch policy: OK (0 warning(s)).
```

## Known gaps

**The 7-vs-51 serving gap is still open, and it is not in my lane.** The ML half
was already closed in Milestone 2 by `ml/src/serving/feature_builder.py`, which
computes the 8 derived columns by calling the training functions. The open half
is `REQUEST_FEATURES` in `backend/app/services/model_service.py`, which lists 7
fields, so 44 still reach the imputer as population defaults. That file belongs
to Samarth and I did not touch it. Nothing in this milestone changes that number.
I did not re-close it in `build_features.py` either, because a second copy of the
serving logic there is exactly the training-serving skew the existing module
exists to prevent.

**The recovery score is not validated against anything.** The weights - 50/25/25 -
are a judgment call frozen by me alone because Teammate 2 could not be reached.
Nothing in the data says those are the right weights, and no clinician has seen
them. They belong in a review before the score is shown to anyone.

**`patient_drivers` covers 200 patients, not all 69,987.** Shipping all of them
would push the artefact past the 5 MB limit. The backend should compute drivers
on demand for a patient outside the sample, or fall back to the global ranking -
`get_patient_drivers` returns `None` rather than raising, for exactly that.

**SHAP explains the uncalibrated margin.** Isotonic calibration is monotonic, so
ranking and sign carry over to the calibrated probability, but the magnitudes do
not. A contribution must not be shown as "this added 3% to the risk".

**One medication column has no comparison.** 20 of the 21 drugs in the contract
appear in the analysis. The missing one is `glimepiride-pioglitazone`, which is
`"No"` for all 69,987 patients, so there are no groups to compare. It is left out
rather than reported as a single group with nothing to contrast against.

**No backend endpoint exists yet.** `docs/ml-insights-contract.md` describes how
`/api/v1/treatment` and `/recommendations/{patient_id}` should call the loader,
but no backend code was written - that is Teammate 2's work and the contract is
what I can offer in their absence.
