# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

- **Intern name:** Kanak Prabhakar
- **Branch:** `intern/11-kanak-prabhakar`
- **Submitted on:** 2026-09-05

---

## Scope for this milestone

- Train patient risk prediction models.
- Generate patient risk scores.
- Build risk prediction dashboards.
- Develop readmission forecasting workflows.
- Generate forecasting reports.
- Build clinical insights modules.

## Evaluation criteria

- Patient risk prediction and readmission forecasting workflows implemented.
- Risk scoring and forecasting models functional.
- Clinical insights generated successfully.
- AI prediction models integrated.

---

## What I built

**The most important fact about this system, before anything else: the
promoted model scores ROC-AUC 0.6518 / recall 0.5099 in its offline
evaluation, and ROC-AUC 0.5881 / recall 0.0994 on a real request through
the API it actually serves.** Both numbers are true and both are reported
throughout this document, never the offline pair alone. The reason is
structural, not a training defect: `RiskPredictionRequest` collects 7
fields; the model was trained on 51. Every real request fills the other 44
with population-typical defaults. `evidence/a16-serving-fidelity.md` is the
full measurement and root-cause writeup; its section (d) ranks exactly
which additional fields would close most of the gap and what each would
cost to collect. This was not fixed this milestone - see Known gaps.

**Risk prediction (`POST /risk/predict`, `backend/app/api/v1/endpoints/risk.py`).**
Scores one admission through `risk_service.score_admission`, which enforces
row-level scope (a doctor may only score their own patients -
`test_doctor_cannot_score_another_doctors_patient`) before calling
`model_service.predict_probability`. A missing or corrupt model artefact
returns 503 with a clear message, proven by
`test_predict_probability_raises_a_clear_error_when_no_artefact_exists` and
`test_metrics_is_503_not_nulls_when_metrics_json_is_missing` - never a
fabricated zero probability. The artefact is loaded once and cached, proven
by `test_the_artefact_is_loaded_from_disk_only_once`, which counts real
`joblib.load` calls rather than asserting the design intent.

**Clinical insights (`backend/app/services/cds_service.py`, new this
milestone).** `generate_insights()` ranks the fields a caller actually
supplied by the model's own aggregated feature importance and phrases the
top few in association-only language - "associated with higher readmission
risk," never a causal verb - proven by
`test_insights_never_use_a_causal_verb`. It deliberately never explains the
44 imputed fields, since those are population defaults for a given
request, not that patient's data (`test_insights_only_cover_fields_the_caller_actually_supplied`).
Degrades to an empty list rather than raising for a model type with no
importance mechanism (`test_insights_are_empty_not_an_error_for_a_model_with_no_importance_mechanism`,
using a real `KNeighborsClassifier`, not a stub). Surfaced inline in
`POST /risk/predict`'s response (`RiskPredictionRead.insights`), confirmed
against the real, currently-trained artefact by
`test_risk_predict_works_against_the_real_trained_artifact`.

**Readmission forecasting (`GET /risk/forecast`).** Aggregates by summing
individual probabilities over the horizon, not by counting patients above
the risk threshold - ten patients at 0.30 forecast three readmissions, not
zero - proven by
`test_forecast_sums_probabilities_rather_than_counting_high_risk`. Row-scoped
identically to `/risk/high-risk`: `test_doctor_forecast_is_row_scoped`
confirms a doctor's forecast excludes another ward's predictions.

**Audit logging (`backend/app/models/audit_log.py`,
`backend/app/services/audit_service.py`).** Every request through
`require_verified_permission`/`require_any_verified_permission` - every
risk and patient-access endpoint - writes an entry naming the actor, their
role, the action, the target resource, and the outcome. A request that
clears the permission check and is only rejected afterwards by row-level
scoping (a doctor requesting a patient outside their assignment) is
corrected from "authorized" to "denied," not left recorded as a success -
proven by `test_cross_scope_patient_read_is_denied_not_success` and, for
`/risk/predict` specifically, by
`test_cross_scope_risk_predict_is_denied_and_names_the_attempted_patient`,
which also confirms the attempted patient id is recorded on a denial, not
only on success. This is the one Milestone 2 capability on this branch that
the mentor's reference implementation on `main` does not have - stated as
fact: `main`'s `backend/app/models/audit_log.py` is unchanged from the
24-line scaffold stub, with no writer and no tests
(`evidence/reference-comparison.md`).

**Model training (`ml/src/models/train.py`).** Trains logistic regression,
random forest, and XGBoost on the full leakage-proofed 51-column feature
set; asserts the four forbidden columns (`readmitted`, `readmitted_30d`,
`encounter_id`, `patient_nbr`) are absent before any model is fit
(`assert_no_leaked_columns`, exercised on every real run and unit-tested in
`ml/tests/test_train.py`); tunes a decision threshold per model against a
validation split, never the test set - a code-structure guarantee (`main()`
calls `select_decision_threshold` on `x_val`/`y_val` and only then scores
`x_test`/`y_test`), not something a dedicated unit test asserts; and, this
milestone, calibrates the
promoted estimator's `predict_proba` output to match observed prevalence
(`evidence/a28-calibration-fix.md`) after that defect was found by
comparing this branch's own promoted artefact against the reference
implementation's stated reason for calibrating.

**Model management (`GET /models/metrics`).** Reads
`ml/artifacts/metrics.json` and returns the promoted model's five real
metrics, or a 503 - never the all-None dict the scaffold shipped with -
proven by `test_metrics_is_503_on_a_malformed_metrics_file` for the case
where `best_model` names a model absent from `results`.

## How to run it

```bash
git clone <repo-url>
git checkout intern/11-kanak-prabhakar

# Backend
cd backend
uv pip install -r requirements-dev.txt
pytest -q                      # 108 passed

# ML - needs the raw dataset first, see ml/data/README.md
cd ../ml
uv pip install -r requirements.txt
python -m pytest -q            # 42 passed
python -m src.models.train     # trains, calibrates, writes ml/artifacts/
python -m src.experiments.n3_feature_engineering   # the feature-lever ledger
python -m src.experiments.a16_serving_fidelity     # the serving-gap measurement

# Repo-level checks (mirrors CI's repo-checks job)
cd ..
python scripts/ci/check_roster.py
python scripts/ci/check_branch.py "$(git branch --show-current)"
python scripts/ci/check_structure.py
python scripts/ci/check_syntax.py
python scripts/ci/check_files.py
python scripts/ci/check_secrets.py
python scripts/ci/check_notebooks.py
python scripts/ci/check_docs.py
python scripts/ci/check_milestones.py
```

Starting the API exactly as `INTERN_GUIDE.md` documents
(`cd backend && uvicorn app.main:app --reload`) now finds the trained model
regardless of that: `MODEL_ARTIFACT_DIR` is anchored against the repository
root, not the process's working directory
(`test_artifact_path_does_not_depend_on_the_process_working_directory`) -
before this milestone's fix it was not, and both `/risk/predict` and
`/models/metrics` returned 503 every time when started this way.

## Evidence

- [`evidence/milestone-2-run.txt`](evidence/milestone-2-run.txt) - real
  stdout of the P4 training run: feature-column list, the leakage check
  passing, `scale_pos_weight`, and all five metrics for all three models.
- [`evidence/n3-feature-ledger.json`](evidence/n3-feature-ledger.json) - the
  full N3 lever ledger: five levers, four reverted, two hyperparameter
  searches kept, with before/after CV ROC-AUC for each.
- [`evidence/metrics-uncalibrated.json`](evidence/metrics-uncalibrated.json) -
  the original promoted run's metrics, preserved before retraining with
  calibration so neither run's numbers were silently replaced.
- [`evidence/a16-serving-fidelity-uncalibrated.json`](evidence/a16-serving-fidelity-uncalibrated.json) -
  the serving-gap measurement (offline vs. as-served) against the original,
  uncalibrated artefact.
- [`evidence/a16-serving-fidelity-calibrated.json`](evidence/a16-serving-fidelity-calibrated.json) -
  the same measurement re-run against the calibrated artefact.
- [`evidence/a16-serving-fidelity.md`](evidence/a16-serving-fidelity.md) -
  the root-cause writeup: the mechanism, why recall collapses while
  accuracy rises, that this is an API-contract defect not a model defect,
  the ranked remedy by feature importance, and why it was not fixed this
  milestone.
- [`evidence/a28-calibration-fix.md`](evidence/a28-calibration-fix.md) - the
  calibration defect (mean predicted probability 0.4564 vs. true prevalence
  0.0898), the fix, and the before/after comparison proving classification
  metrics are unaffected.
- [`evidence/reference-comparison.md`](evidence/reference-comparison.md) -
  an honest, bidirectional comparison against the mentor's own reference
  implementation of this milestone: where it is ahead of this branch, where
  this branch has something it does not, and which one I would want as the
  reviewer.
- [`evidence/milestone-1-run.txt`](evidence/milestone-1-run.txt) - carried
  over from Milestone 1, unrelated to this report.

## Metrics

All five metrics, every model, from the current (calibrated) promoted run:

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---|---|---|---|---|
| logistic_regression | 0.6070 | 0.1268 | 0.5736 | 0.2077 | 0.6280 |
| random_forest | 0.6635 | 0.1410 | 0.5394 | 0.2235 | 0.6459 |
| **xgboost** | **0.6868** | **0.1454** | **0.5099** | **0.2263** | **0.6518** |

The positive class (readmitted within 30 days) is 8.98% of the dataset. A
model that predicts "no readmission" for every patient scores about 91%
accuracy and catches nobody - none of these three numbers are that model:
66-69% accuracy with real recall around half, which is why ROC-AUC and
recall are what this project tracks, not accuracy in isolation.

**Winner: xgboost**, by ROC-AUC, and the only model whose test-set numbers
clear both promotion thresholds (ROC-AUC ≥ 0.65, recall ≥ 0.50). **Promoted:
true.** The margin is 0.0018 (0.6518 vs. the 0.65 bar) - narrow. The winning
configuration's cross-validated ROC-AUC fold-to-fold standard deviation,
measured before calibration, was 0.0057 (larger than this margin); isotonic
calibration preserves ranking almost exactly (confirmed by the
classification metrics below being bit-for-bit identical before and after
it), so that variability is not expected to have changed materially, though
it was not independently re-measured on the calibrated configuration. A
different split or fold assignment could plausibly land on either side of
0.65. Separately, three models were scored on the same held-out test set
and the best of the three was chosen by that score, which carries a small
"best-of-three" optimism relative to one model chosen in advance and scored
once - a known effect of selecting a winner among several candidates on the
same data, not a violation of the once-only test-set rule (all three were
scored together, once).

**Uncalibrated vs. calibrated, the defect and its fix (full detail in
`evidence/a28-calibration-fix.md`):** `class_weight="balanced"`/`scale_pos_weight`
train every estimator as if the classes were roughly 50/50, which is
correct for ranking but leaves `predict_proba` centred on that fictional
prior. Measured on the promoted xgboost artefact:

| | Uncalibrated | Calibrated |
|---|---|---|
| Mean predicted probability | 0.4564 | 0.0902 |
| True prevalence | 0.0898 | 0.0898 |
| Accuracy / Precision / Recall / F1 | 0.6868 / 0.1454 / 0.5099 / 0.2263 | identical, bit-for-bit |
| ROC-AUC | 0.6534 | 0.6518 |

The 0.0016 ROC-AUC change is isotonic calibration introducing a small
number of probability ties that were not ties in the raw scores - a known
minor side effect of the tie-handling in AUC computation, not evidence that
anything else about the model changed.

**Offline vs. as-served, both runs (full detail in
`evidence/a16-serving-fidelity.md`):**

| | Offline | As served (7 supplied, 44 imputed) |
|---|---|---|
| Uncalibrated ROC-AUC / Recall | 0.6534 / 0.5099 | 0.5991 / 0.0994 |
| **Calibrated ROC-AUC / Recall** | **0.6518 / 0.5099** | **0.5881 / 0.0994** |

Recall as served is bit-for-bit identical before and after calibration
(0.09944311853619729 both times): calibration rescales the probability
axis; it does nothing about the actual cause of the gap, which is that 44
of the 51 fields the model needs never reach it. **A caller of
`/risk/predict` today gets a model that catches roughly 1 readmission in
10, not 1 in 2.**

## Known gaps

**The 7-vs-51 serving contract gap is open.** `RiskPredictionRequest`
collects 7 fields; the model needs 51. The current 7 cover 7.3% of the
model's total feature importance. Ranked by that importance
(`evidence/a16-serving-fidelity.md`, section (d)): the raw ICD-9 diagnosis
codes and `medical_specialty` would raise coverage to 48.4% but require
integrating with wherever diagnosis codes are already coded (an EHR's
coding module, not a form field); the coarser diagnosis groupings reach a
smaller 28.3% for a much easier ask; `age`, `race`, and
`discharge_disposition_id` are ordinary structured fields most systems
already have; the remaining 34 columns (individual medications, lab flags,
admission counts) are 27.3% spread thin, none above 2.1%. Not fixed this
milestone - closing it means redesigning the request schema, a product
decision with frontend and integration consequences, not a contained bug
fix.

**Only 1 of 108 backend tests calls the real, currently-trained model
through the real endpoint** (`test_risk_predict_works_against_the_real_trained_artifact`).
Ten tests mock `predict_probability` outright: five rely on a faked success
to test something else (audit logging, persistence, high-risk filtering),
three have the mock present but never reach it (the request is rejected by
a permission or scope check first), two deliberately simulate a failure to
test the 503 path. This is exactly the gap that let the 7-vs-51 mismatch
survive 90 green tests before it was found. A related, smaller instance of
the same pattern: `/models/metrics`'s tests all read a synthetic
`metrics.json` fixture; none reads the real one on disk.

**A denied-by-crash audit entry can be left stuck at "authorized" forever.**
If the worker process dies between the guard writing the tentative
"authorized" entry and the endpoint concluding, the row is never corrected
to "denied" or "success." Bounded by how many requests were in flight at
the instant of a crash, not unbounded growth under normal operation. A
compliance query should read such a row as "outcome unknown - the process
did not survive to record it," never as an implicit success or denial. No
sweeper was built: a timeout-based guess at "abandoned" could misclassify a
slow-but-healthy request exactly as wrongly as the crash it exists to
clean up, and this project has no scheduled-task infrastructure anywhere
else to justify adding one for a rare, already-honestly-labelled edge case.

**Audit logs live in PostgreSQL, not MongoDB**, despite `db/mongodb.py`'s
original docstring (since corrected) listing audit trails among its
purposes. `actor_id` must stay a valid foreign key into `users` even as
accounts are soft-deleted - deleted, never removed, precisely so audit
history survives - which is a referential-integrity guarantee the document
store does not give for free. `CLAUDE.md` and `db/mongodb.py`'s docstring
were both corrected to reflect this rather than left contradicting the
code.

**Four of five feature-engineering levers were reverted; the fifth
(hyperparameter search) is what actually reached the promotion bar.** ICD-9
diagnosis grouping, the utilisation ratio/interaction features, the
medication-change flag, and binning `number_diagnoses`/treating age as
ordinal all showed a small negative delta under a deliberately lightweight
screen (50 trees, 3-fold CV, run at reduced strength after this machine was
observed running 15-20x slower than expected under real desktop
contention). The honest reading is "no improvement under a screen too weak
to rule out a small real effect either way," not "these do not help on
this dataset" - the screen's baseline (0.6057) is not comparable to the
real config's baseline (0.6384), and all four deltas fell between -0.002
and -0.006, inside a band that screen cannot reliably separate from noise.
Lever 1 specifically likely did little because the encoder already
collapses rare ICD-9 codes via `min_frequency=0.01`, independent of whether
the lever's explicit column-drop ran.

## What I would do next

The reference comparison (`evidence/reference-comparison.md`) named three
designs worth adopting, not implemented on this branch per the constraint
that nothing be copied from it after reading it:

- **A self-describing artefact.** Persist one dict - pipeline, model
  name/version, decision threshold, `feature_columns`, metrics - instead of
  a bare pipeline whose metadata lives in a second file (`metrics.json`)
  correlated only by filename convention.
- **A wider, fully-optional request schema.** Accept whichever of the
  model's real input fields a caller has, rather than a fixed 7, so a
  caller who has more data gets a materially better prediction without a
  breaking schema change for one who does not.
- **`features_supplied`/`features_expected` on the response.** Let a caller
  see, per request, how much of their specific prediction rested on
  imputed defaults - the exact visibility A16 had to build a whole
  measurement pass to get after the fact, that the response could report
  directly.
