# Model card — 30-day readmission risk (HealthForecast AI)

_Milestone 4, Teammate 3 (Model Lineage & Validation). Every number below was produced by
`ml/scripts/seed_model_runs.py` and `ml/scripts/drift_and_leakage_report.py` on 2026-10-02,
read from `ml/artifacts/model_runs_seed.json` and `ml/artifacts/drift_and_leakage_summary.json`.
Re-run those two scripts after any retraining and update this card from their output._

## 1. Model details

| | |
|---|---|
| Task | Binary classification: will this diabetic inpatient be readmitted within 30 days of discharge? |
| Active (production) model | **XGBoost** `XGBClassifier`, wrapped in isotonic calibration (`CalibratedClassifierCV` around a frozen `Pipeline[ColumnTransformer → XGBClassifier]`) |
| Artifact | `ml/artifacts/readmission_model.joblib` — the file `backend/app/services/model_service.py` loads |
| Registry entry | `model_runs` run_id **`xgboost-3b1d27b045bb`**, `model_version` `xgboost-202609301703`, `is_active: true`. **Dry-run only:** the document exists in `ml/artifacts/model_runs_seed.json` but has not been upserted into MongoDB yet (see §11) |
| Framework | xgboost 2.1.4, scikit-learn 1.6.0, Python 3.12 |
| Decision threshold | **0.1117478535** (probability ≥ threshold → flag for follow-up) |
| Hyperparameters | n_estimators 300, max_depth 6, learning_rate 0.01, subsample 0.6, colsample_bytree 0.6, scale_pos_weight 10.14 (negatives/positives on train), random_state 42 — from `ml/configs/config.yaml`, tuned in M2 (N3 lever 5, train-only CV) |
| Inputs | 51 columns of one hospital encounter (206 after one-hot encoding) |
| Output | A calibrated probability in [0, 1]; the platform also maps it to low/medium/high bands (0.40 / 0.70) |
| Owner / contact | HealthForecast AI ML team (intern project, branch `intern/11-kanak-prabhakar`) |

## 2. Intended use

- **Decision support only.** The score helps a care team decide *which discharged patients to
  prioritise for follow-up* (phone call, early clinic visit, medication review). It is **not a
  clinical diagnosis**, does not say *why* a specific patient will return, and must never be the
  sole reason to give or withhold care.
- **Users:** clinicians and care coordinators through the HealthForecast UI; system administrators
  through `GET /api/v1/models` (RBAC `MODEL_MANAGE`).
- **Out of scope:** non-diabetic patients, paediatric patients (only 29 under-10s in the test set),
  any population or time period not resembling US hospitals 1999–2008, automated decisions with
  no human in the loop, insurance or eligibility decisions.

## 3. Training data and preprocessing

**Dataset:** UCI *Diabetes 130-US Hospitals for years 1999–2008* (Strack et al., 2014),
`ml/data/raw/diabetic_data.csv`, sha256 `d00fe453ec6a4c7ff19df7a727d1ff1fd7d80c4c07979be9b58f4d522cc6af79`.
The file is never committed (see `ml/data/README.md`); the hash pins exactly which bytes were used.

| Step (code) | Effect | Rows |
|---|---|---|
| raw CSV (`load_data.load_raw`) | `?` and `Unknown/Invalid` → missing; literal `"None"` kept as "test not done" | 101,766 |
| `preprocess.basic_clean` | drop `encounter_id`, `weight`, `payer_code`; constant columns dropped; missing `race`/`diag_*`/`medical_specialty` → explicit "Missing"; rows without gender dropped | |
| — remove expired/hospice | discharge dispositions 11, 13, 14, 19, 20, 21 removed (2,423 raw rows) — these patients cannot be readmitted and would corrupt the label | |
| — first encounter per patient | one row per `patient_nbr` → independent rows, no patient in two splits | **69,987** |
| — derived columns | ICD-9 diagnosis groups, age midpoint + age band | |
| `build_features.build_features` | prior-visit total, medication-change and medications-prescribed counts, utilisation ratio/interaction | |
| target (`binarise_target`) | `readmitted == "<30"` → 1, `">30"`/`"NO"` → 0. Prevalence ≈ 9.0% | |
| identifiers dropped | `patient_nbr`, `encounter_id`, `readmitted` asserted absent (`assert_no_leaked_columns`) | |
| `build_preprocessor` (fit on train only) | numeric: median impute + standardise; categorical: most-frequent impute + one-hot (`min_frequency=0.01`, unknowns ignored) | |

**Split:** stratified random split, `random_state=42`: **train 48,990 / validation 6,999 / test 13,998**
(70/10/20). Because each patient has exactly one row, this is patient-disjoint: measured overlap
train/test = **0**, train/val = 0, val/test = 0.
Class imbalance: `class_weight="balanced"` (LR, RF) / `scale_pos_weight` (XGBoost), then isotonic
calibration on validation so probabilities match the real ~9% prevalence (mean predicted 0.090 vs
0.456 uncalibrated).

## 4. Performance — all three models (test split, n = 13,998, prevalence 8.98%)

Each model is scored at **its own** validation-tuned threshold. Computed by
`seed_model_runs.py` from the saved artifacts and verified to reproduce `metrics.json` exactly
(difference < 1e-9 on threshold, ROC-AUC, recall, precision).

| Model | run_id | ROC-AUC | PR-AUC | Recall | Precision | F1 | Brier | Accuracy | Threshold | Promotion bar met | Median latency* |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Logistic regression | `logistic_regression-3dfc8d25b129` | 0.6280 | 0.1451 | 0.5736 | 0.1268 | 0.2077 | 0.0800 | 0.6070 | 0.0927 | ✗ (ROC-AUC < 0.65) | ~6 ms |
| Random forest | `random_forest-d7c3451767db` | 0.6459 | 0.1581 | 0.5394 | 0.1410 | 0.2235 | 0.0795 | 0.6635 | 0.1000 | ✗ (ROC-AUC < 0.65) | ~13 ms |
| **XGBoost (active)** | `xgboost-3b1d27b045bb` | **0.6518** | **0.1663** | 0.5099 | **0.1454** | **0.2263** | **0.0791** | **0.6868** | 0.1117 | ✓ | ~7–18 ms |

Baselines for reading these: ROC-AUC 0.5 = random ranking; PR-AUC baseline = prevalence (0.090);
Brier of always predicting the prevalence = 0.0817.
\*In-process `predict_proba` on one test row after warm-up, median of 200 calls, on a laptop;
excludes HTTP/auth/DB. Two consecutive runs gave XGBoost 17.8 ms and 7.4 ms, so treat it as
"single-digit to tens of ms", not a precise figure. Values are stored per run in
`serving_latency_ms` (median + p95).

Active-model confusion matrix at 0.1117 (test): **TP 641, FN 616, FP 3,768, TN 8,973.**

## 5. Why XGBoost is the active model

1. `train.py` selects the model with the best **ROC-AUC on test** (`evaluation.primary_metric`)
   and saves only that one; XGBoost wins (0.6518 vs 0.6459 RF, 0.6280 LR).
2. It is the **only one of the three that clears the promotion bar** in `config.yaml`
   (`roc_auc ≥ 0.65` and `recall ≥ 0.50`). LR and RF are recorded in the `model_runs` seed with
   `promoted: false` for comparison but must not serve.
3. It is also best on PR-AUC, precision, F1 and Brier — it does not win ROC-AUC by trading away
   calibration.

Honest caveat: the margins are small (RF is 0.006 ROC-AUC behind), and choosing the winner on
the test split means the winner's test ROC-AUC is very slightly optimistic. The *threshold* was
not chosen on test (next section).

## 6. The 0.1117 threshold

- **How:** `select_decision_threshold` (`ml/src/evaluation/metrics.py`) scans the precision–recall
  curve and picks **the highest-precision cutoff whose recall is still ≥ 0.50** — the recall floor
  is `evaluation.thresholds.recall` in the config. The platform's priority is to catch at least
  half of the patients who will return, then waste as little follow-up effort as possible.
- **Which split:** **validation** (after isotonic calibration on the same validation split; test is
  never used for either). Evidence in the drift report §1.4: re-running the rule on validation
  returns exactly 0.1117478535, and the selection-time recall/precision stored by `train.py`
  (0.5072 / 0.1425) equal the validation values recomputed now, not the test values
  (0.5099 / 0.1454). Caveat: the calibrated model outputs only 26 distinct probability levels, so
  the same rule run on test happens to land on the same step. That comparison by itself can't tell
  the two splits apart.
- **Trade-off it creates (test split):** out of every 100 patients flagged, about **15 are truly
  readmitted** (precision 0.145) while the model catches **51% of all readmissions** (recall 0.510)
  and misses 49%. It flags 31.5% of all discharged patients (4,409 of 13,998). Raising the
  threshold would cut the follow-up workload but drop recall below the 0.50 floor; lowering it
  catches more returns at the cost of many more false alarms. The alternative thresholds of the
  other models show the same curve: LR at 0.093 gets recall 0.57 but precision 0.127.

## 7. Subgroup performance (active model, test split, threshold 0.1117)

Full tables are in `drift-and-leakage-report.md` §4. Highlights:

| Group | n | Prevalence | ROC-AUC | Recall | Precision | False-positive rate |
|---|---|---|---|---|---|---|
| Female | 7,511 | 0.088 | 0.655 | **0.538** | 0.141 | 0.318 |
| Male | 6,487 | 0.091 | 0.649 | **0.479** | 0.151 | 0.270 |
| Age 30–40 | 535 | 0.065 | 0.677 | **0.286** | 0.159 | 0.106 |
| Age 40–50 | 1,352 | 0.070 | 0.610 | **0.298** | 0.130 | 0.149 |
| Age 50–60 | 2,464 | 0.079 | 0.667 | 0.374 | 0.179 | 0.148 |
| Age 70–80 | 3,610 | 0.105 | 0.648 | 0.598 | 0.155 | 0.382 |
| Age 80–90 | 2,237 | 0.102 | 0.637 | **0.697** | 0.130 | **0.529** |
| African American | 2,505 | 0.092 | 0.672 | 0.476 | 0.165 | 0.244 |
| Caucasian | 10,520 | 0.091 | 0.642 | 0.515 | 0.140 | 0.315 |
| Hispanic | 286 | 0.105 | 0.690 | 0.533 | 0.222 | 0.219 |
| Asian | 96 | 0.094 | 0.754 | 0.556 | 0.263 | 0.161 |

What this shows: **age is the largest disparity.** One global threshold means patients under 60
have their readmissions caught far less often (recall 0.29–0.37), while over half of non-returning
80–90-year-olds get flagged. Men are caught somewhat less often than women (0.48 vs 0.54). Ranking
quality (ROC-AUC) is similar across race groups; the small groups (Asian n=96, Other n=230) have
wide uncertainty. Under-10s (n=29, no readmissions) are too few to evaluate.

## 8. Drift and leakage (summary of `drift-and-leakage-report.md`)

- No patient overlap between any splits (0), no target-derived features, strongest single feature
  alone reaches only AUC 0.574, expired/hospice rows removed (0 remain).
- Train vs test: no drift (max PSI 0.036).
- Across `encounter_id`-ordered chunks (time proxy): significant drift (PSI > 0.2) in 8 features,
  max PSI 1.49 (`discharge_disposition_id`). It is mostly recording practice: code 18 disappears,
  `medical_specialty` "Missing" goes from 41% to 67%, and `number_diagnoses` above 9 appears only
  in the latest chunk. The 30-day readmission rate falls from 9.9% to 6.7% in the last chunk.
- Concept drift: ROC-AUC per chunk 0.632–0.681 with overlapping 95% bootstrap CIs, so ranking
  holds. But **recall at the fixed 0.1117 falls to 0.431 in the latest chunk**, below the 0.50 bar.

## 9. Limitations

- **Modest discrimination.** ROC-AUC 0.65 is typical for this public dataset but means many
  false alarms: about 6 of every 7 flagged patients will not be readmitted.
- **Old, US-only data (1999–2008)** with no real dates. Coding practices visibly changed within
  the period, so performance on present-day records is unknown and likely lower.
- **Random, not temporal, split.** Train and test mix all periods, so the test score is a
  time-averaged estimate. A temporal hold-out would be the stricter test.
- **Model chosen on the test split.** `train.py` picks the winner by ROC-AUC (`primary_metric`)
  measured on the **test** split, so the reported test metrics are mildly optimistic: the test
  set helped choose among 3 models, so it is not fully untouched. The decision threshold itself
  was tuned on validation. The bias is small (XGBoost beat RF by only 0.006 ROC-AUC), but a future
  retrain should select the model on validation and touch test once, at the end.
- **Fixed threshold.** It was tuned at ~9% prevalence and loses recall when prevalence drops
  (latest chunk). It must be re-validated on local data before use.
- **One encounter per patient** (first only). The model never learned from a patient's later
  admissions, and serving a patient's repeat visit is slightly out of distribution.
- **Calibration is coarse.** Isotonic calibration gives 26 distinct probability levels, so many
  patients share the exact same score.
- **No admission dates, labs or vitals over time, social factors or post-discharge support**,
  which are all known readmission drivers.
- Latency was measured in-process on a laptop, not on the deployed API.

## 10. Ethical considerations

- **Human in the loop.** The score is advisory. RBAC enforces it server-side: only authorised
  roles see predictions, and `/api/v1/models` is admin-only.
- **Unequal error rates across age and sex** (§7). One global threshold under-serves younger
  patients and men. Before clinical use, review per-group thresholds or at minimum show
  clinicians the subgroup recall.
- **Race is an input feature.** It may encode access-to-care differences, not biology. It was kept
  so that disparities stay measurable, and the subgroup tables are the guard against it
  harming any group. Removing it should be evaluated rather than assumed safer.
- **Privacy:** no direct identifiers are used as features; `patient_nbr` and `encounter_id` are
  dropped and asserted absent. `model_runs` stores no patient data, only aggregates.
- **Missed readmissions are the costly error.** That is why recall has a hard floor (0.50) and
  is never traded away for accuracy.

## 11. Lineage

```
dataset  ml/data/raw/diabetic_data.csv
         sha256 d00fe453ec6a4c7ff19df7a727d1ff1fd7d80c4c07979be9b58f4d522cc6af79
   │     (+ ml/configs/config.yaml: split, cleaning, models, thresholds)
   ▼
code     git commit d71f347d6b1b91044a8df67b191def74f96e226a  (src/models/train.py)
   ▼
artifact ml/artifacts/readmission_model.joblib
         sha256 3b1d27b045bb2b5b6a91449704180e000b57ca9d6767974583a2ca9b60a0aae2
         (trained 2026-09-30 17:03 UTC = file mtime; metrics.json written in the same run)
   ▼
registry ml/artifacts/model_runs_seed.json  run_id xgboost-3b1d27b045bb  (is_active: true)
         DRY-RUN ONLY - target MongoDB healthforecast.model_runs not seeded yet
```

- `run_id` = `<algorithm>-<first 12 hex of artifact sha256>`. The same file always gives the same
  run_id (the seed upserts on it, so it is idempotent), and a retrained model gets a new run_id.
- **The registry is dry-run only.** `seed_model_runs.py --dry-run` has produced and validated
  all 3 documents, but the real upsert has not run yet because no reachable MongoDB has been
  configured (`MONGO_URI` is still a placeholder). Until it runs, `healthforecast.model_runs` is
  empty and `GET /api/v1/models` has nothing to read. To seed it, run
  `python -m scripts.seed_model_runs` from `ml/` with a working `MONGO_URI`. The upsert is keyed
  on `run_id`, so the result is 3 documents with exactly one `is_active: true`.
- `git_commit` is HEAD when the seed ran. The seed ran on a clean tree (`git_dirty: false` for
  all 3 runs). The training code (`train.py`, `config.yaml`, data and feature modules) is
  unchanged since the models were trained, and the seed proves the artifact matches it:
  retraining-free re-evaluation reproduces `metrics.json` to < 1e-9.
- The LR and RF artifacts (`ml/artifacts/logistic_regression.joblib`, `random_forest.joblib`) did
  not exist, because `train.py` saves only the winner. The seed retrained them with `train.py`'s own
  functions and identical config/split, and their metrics match `metrics.json` exactly. Like all
  `*.joblib` files they are gitignored. On another machine they would be retrained and could get a
  different sha256, and therefore a different run_id.

**Reproduce:**
```bash
cd ml
python -m src.models.train                      # only if readmission_model.joblib is missing
python -m scripts.seed_model_runs --dry-run     # model_runs_seed.json only (current state)
python -m scripts.seed_model_runs               # real upsert into Mongo - not run yet, needs MONGO_URI
python -m scripts.drift_and_leakage_report      # this card's drift/subgroup numbers
```
