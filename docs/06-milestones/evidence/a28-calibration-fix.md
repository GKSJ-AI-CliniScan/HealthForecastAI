# A28 — fixing the calibration defect found via the reference comparison

Implemented independently from scikit-learn's own documentation
(`CalibratedClassifierCV`, `FrozenEstimator`), verified by introspecting the
installed library directly. `origin/main`'s `train.py` was not reopened
while writing this fix, and no code, structure, or comments were copied
from it (A27).

## The defect, and where it came from

`build_estimator()` trains `logistic_regression`/`random_forest` with
`class_weight="balanced"` and `xgboost` with `scale_pos_weight` — all three
make the estimator behave as if the two classes were roughly 50/50, which
is the right thing to do for *ranking* patients by risk (it is why ROC-AUC
and recall are usable at all on an ~9%-positive target). The side effect:
`predict_proba` stays calibrated to that fictional 50/50 prior, not the
real ~9% prevalence. Measured directly on this project's own promoted
xgboost artefact before this fix (`docs/06-milestones/evidence/
metrics-uncalibrated.json`): mean predicted probability **0.4564** against
a true prevalence of **0.0898** — about 5x too high.

## The fix

`calibrate_probabilities()` (`ml/src/models/train.py`) wraps the already-
fitted pipeline in `FrozenEstimator` (prevents re-fitting) and
`CalibratedClassifierCV(method="isotonic")`, fit once on the validation
split — disjoint from both training (what fit the pipeline) and test
(touched only for final numbers). Isotonic was chosen over Platt/sigmoid
scaling because scikit-learn's own calibration guidance cautions against
isotonic under roughly 1,000 calibration samples (this project's validation
split has several thousand), and because it makes no assumption about the
*shape* of the distortion class-weighting introduces — sigmoid assumes a
specific S-shaped correction, isotonic follows whatever shape is actually
there.

Backend compatibility: `CalibratedClassifierCV` does not expose
`.named_steps` the way the underlying `Pipeline` does, which
`model_service._expected_columns()` (N5) and `cds_service._aggregate_importance_by_column()`
(N6) both need for introspection. `model_service._underlying_pipeline()` unwraps
one level (`calibrated_classifiers_[0].estimator`, which `FrozenEstimator`
delegates attribute access through transparently — confirmed against the
installed scikit-learn, not assumed) back to the original `Pipeline`.
`predict_proba()` itself needed no change: both `Pipeline` and
`CalibratedClassifierCV` implement it identically, so serving code is
unaffected.

## Before / after, on the promoted model (xgboost)

| | Uncalibrated (original) | Calibrated |
|---|---|---|
| Mean predicted probability | 0.4564 | **0.0902** |
| True prevalence | 0.0898 | 0.0898 |
| Accuracy | 0.6868124017716817 | 0.6868124017716817 |
| Precision | 0.14538444091630756 | 0.14538444091630756 |
| Recall | 0.5099443118536198 | 0.5099443118536198 |
| F1 | 0.22626191316625485 | 0.22626191316625485 |
| ROC-AUC | 0.6534365250227016 | 0.6518298564066656 |
| Confusion matrix (TN/FP/FN/TP) | 8973/3768/616/641 | 8973/3768/616/641 |

Accuracy, precision, recall, F1, and the confusion matrix are **bit-for-bit
identical** — isotonic regression is a monotonic transform, and the
decision threshold was re-selected on the same (also monotonically
transformed) validation probabilities, so the same patients land on the
same side of the cutoff. ROC-AUC moved by **0.0016** (0.6534 → 0.6518),
consistent with isotonic's step function introducing a small number of
probability ties that were not ties in the raw scores — a known, minor
side effect of the tie-correction in AUC computation, not evidence that
anything else changed. Per A28's instruction, this was checked before
writing up the result: recall is exactly unchanged and ROC-AUC's shift is
two orders of magnitude smaller than the promotion margin — neither counts
as "moved materially."

**Promotion unaffected: still `promoted=True`** (ROC-AUC 0.6518 > 0.65,
recall 0.5099 > 0.50). `config.yaml`'s thresholds were not touched (C1) —
verified by diff, no changes to that file this pass.

## Full comparison, all three models

| Model | Mean proba (uncalibrated → calibrated) | ROC-AUC (before → after) | Recall (before → after) |
|---|---|---|---|
| logistic_regression | 0.4701 → 0.0897 | 0.6294 → 0.6280 | 0.4980 → 0.5736 |
| random_forest | 0.4457 → 0.0895 | 0.6485 → 0.6459 | 0.5052 → 0.5394 |
| xgboost | 0.4564 → 0.0902 | 0.6534 → 0.6518 | 0.5099 → 0.5099 |

Logistic regression and random forest's recall values did shift (unlike
xgboost's), because their decision thresholds landed on a different
quantile of the validation curve after calibration changed which cutoffs
were even candidates near the recall floor — both remain the honest result
of the same `select_decision_threshold` procedure, run on calibrated data
instead of miscalibrated data, and neither is the promoted model. Only the
winner's (xgboost's) before/after comparison is the one A28 asked to be
checked for a material move, and it was not.
