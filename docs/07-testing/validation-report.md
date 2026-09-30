# Validation report

What was checked before this platform was called ready, how, and what the checks
found. Everything here is reproducible from the repository; the commands are
listed at the end.

## 1. Prediction accuracy

Scored on the **held-out test split**: 12,599 patients and 1,179 readmissions that
were never used to fit, calibrate or tune the model
(`python -m src.evaluation.validate` writes `ml/artifacts/validation.json`).

| Measure | Result | Reading |
|---|---|---|
| ROC-AUC | **0.633** (95% CI 0.618-0.650, bootstrap) | Ranks a readmitted patient above a non-readmitted one 63% of the time |
| The ward's existing rule (prior inpatient stays) | 0.538 | The model adds real signal over the obvious rule |
| Recall at the decision threshold | 0.501 | Catches half of readmissions... |
| Precision at the decision threshold | 0.142 | ...while flagging 33% of patients, most of whom are not readmitted |
| Brier score | 0.0827 (0.0848 for always predicting the base rate) | Small but real improvement over no model |
| Mean predicted / observed rate | 9.2% / 9.4% | Calibrated on average |

Calibration and lift by risk band, on the same held-out patients:

| Band | Patients | Predicted | Observed (95% CI) | Lift over baseline |
|---|---|---|---|---|
| High (>= 20%) | 616 (4.9%) | 24.6% | 24.7% (21.4-28.2%) | **2.6x** |
| Medium (12-20%) | 2,292 (18.2%) | 15.1% | 13.2% (11.9-14.6%) | 1.4x |
| Low (< 12%) | 9,691 (76.9%) | 6.9% | 7.5% (7.0-8.0%) | 0.8x |

**What this means.** The model is a triage aid, not a diagnosis. It is honest about
its probabilities (predicted and observed agree in the high and low bands), it
separates risk moderately (2.6x at the top, 0.8x at the bottom), and its
discrimination sits inside the 0.63-0.68 range published for this dataset. A
ROC-AUC of 0.63 is not a strong classifier and should not be presented as one.

**Not a like-for-like number.** The Risk page's calibration table scores every
patient in the database, including the 70% the model was trained on, so it shows
sharper bands than the table above. The page says so. Quote this table.

## 2. Fairness

Recall differs by gender (0.446 men, 0.551 women) and by age (0.340 at 40-50,
0.57 at 70+). Race is within noise. Race and gender are not model inputs.
Full audit, with the cutoff that would close each gap and what it would cost:
[fairness-audit.md](fairness-audit.md). These gaps are **not fixed**; that needs a
clinical decision.

## 3. Analytics quality

Statistics are implemented from first principles (no black-box library call) and
verified against independent references:

- `tests/test_stats.py` (24 tests): Wilson, Garwood Poisson and Mantel-Haenszel values, first
  cross-checked against statsmodels and scipy, then pinned as fixed expectations, with edge cases
  (zero events, empty strata, perfect separation).
- A first-draft Poisson interval was found to be up to 48% off at small counts
  and was replaced with the exact interval; the tests pin known values.
- `tests/test_reconciliation.py`: on one known cohort, the summary, age
  breakdown, performance rows, trend chart, calibration bands, recovery report
  and every dimension in the CSV export all add up to the same totals.
- Confounding is demonstrated, not assumed: a test builds a treatment whose
  crude effect vanishes after stratification.

Bugs the validation itself found:

| Found by | Problem | Fix |
|---|---|---|
| p-chart on real data | Newest encounters showed impossibly low readmission: the data has not had time to show them (right-censoring) | Newest 10% of encounters held back; sensitivity table in `config.yaml` |
| Threshold stability check | 0.50 recall floor met on validation, missed on test by chance | Threshold from 5-fold out-of-fold predictions, Wilson lower bound |
| Explanation vs displayed risk | TreeSHAP pointed opposite to the displayed risk for a class-weighted model | Replaced by occlusion on the displayed probability |
| Cold dashboard queries | 5-6 s on the first request after a load | `ANALYZE` after bulk loads, plus a composite index; 0.2-0.4 s warm |

## 4. Security

| Control | Test |
|---|---|
| Role matrix on every endpoint; out-of-scope records are 404 | `test_rbac.py`, `test_treatment.py`, `test_cds.py` |
| Every read of patient data, and every export, is audited | `test_audit.py`, `test_reports.py` |
| k-anonymous, pseudonymised research export; spreadsheet formula injection neutralised | `test_reports.py` |
| Lockout after 5 failed sign-ins in 15 minutes, across instances (audit-log backed) | `test_hardening.py` |
| Production refuses to start with a default secret, `DEBUG`, or `*` CORS | `test_hardening.py` |
| No-store cache headers on API responses, `nosniff`, frame denial | `test_hardening.py` |
| Interactive docs disabled outside `DEBUG` | `main.py` |

Known gap: the JWT is held in `sessionStorage`, readable by any script on the page.
An httpOnly cookie is the right fix and is not done.

## 5. Performance

See [performance.md](performance.md).

## 6. End-to-end

`tests/e2e/test_platform.py` drives a running deployment over HTTP through all four
role journeys, the recommendation and export features, and the lockout. It skips
itself when no platform is reachable.

## Reproduce

```bash
cd backend && pytest                     # unit and integration
cd ml && pytest                          # pipeline
cd ml && python -m src.evaluation.validate   # held-out accuracy
cd ml && python -m src.evaluation.fairness   # fairness audit
E2E_PASSWORD='<seed password>' pytest tests/e2e -v   # against a running stack
python scripts/loadtest.py --password '<seed password>' --concurrency 20 --seconds 30
```
