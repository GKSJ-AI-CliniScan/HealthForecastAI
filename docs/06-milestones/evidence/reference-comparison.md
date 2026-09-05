# Comparison against the mentor's reference implementation (main)

Read, not copied: `origin/main`'s `backend/app/services/model_service.py`,
`backend/app/schemas/prediction.py`, `backend/app/api/v1/endpoints/risk.py`,
and `ml/src/models/train.py` (commits `36dc481`, `ac31250`). Nothing from
these files was brought into this branch's code — per A26, anything worth
adopting is named below as future work, not implemented here.

---

## (a) Where the reference is better

**Its artifact format is a real design, not a bare pipeline.** `train.py`
persists a dict — pipeline, model name/version, tuned decision threshold,
`feature_columns`, `metrics`, `top_drivers`, `trained_at` — as one
self-describing object. This branch's artifact is the sklearn `Pipeline`
alone; every piece of metadata (`model_version`, the metrics table) is
carried in a *second* file (`metrics.json`) that a reader has to know to
also open and correctly correlate with the pipeline by filename convention.
The reference's approach is more robust: one file, one load, nothing to get
out of sync.

**It calibrates its probabilities, and it can prove why that matters.** Its
own comment records the finding: with `class_weight="balanced"` /
`scale_pos_weight` and no calibration, the mean predicted probability came
out at 0.47 against a true prevalence of about 9%, and summing those
probabilities forecast 32,581 readmissions against 6,285 actual. Checking
the identical failure mode against **this branch's own promoted artifact**:

| | Value |
|---|---|
| True prevalence (test set) | 0.0898 |
| This branch's mean predicted probability | **0.4564** |
| Sum of predicted probabilities (13,998 test rows) | 6,388.7 |
| Actual positives in the same rows | 1,257 |
| Overestimate | **~5.1x** |

This branch has the exact same defect, undiscovered until reading the
reference's comment and checking for it here. It does not corrupt
everything: ROC-AUC is rank-based and the decision thresholds were tuned
against this same (miscalibrated) scale, so the promotion decision's
ROC-AUC/recall numbers stand as reported. But two things this branch built
and reported as correct are not, on real numbers, at this scale: `/risk/
forecast`'s expected-count (N7 verified the *aggregation method* — sum, not
count-above-threshold — which is the right method on the wrong scale, and
that distinction was missed), and every stored `risk_category` band, since
`0.40`/`0.70` are fixed absolute cutoffs being compared against
probabilities centred five times too high. This branch's risk bands and
forecast numbers should not be trusted as clinically meaningful until this
is fixed — stated plainly, not softened, and not fixed here (A26).

**Its request schema reports its own coverage.** `RiskPredictionRequest`
makes all ~17 model-input fields optional and accepts whichever the caller
has; `RiskPredictionRead` reports `features_supplied` against
`features_expected` on every response. A caller — and this branch's own A16
finding — can *see* how much of a given prediction rests on imputed
defaults, request by request. This branch's response carries no such
signal: a caller cannot tell, from the response alone, that 44 of 51
features were imputed for their request. Even before weighing calibration,
this is the more honest design for the exact problem A16 spent a full
measurement pass quantifying after the fact.

**Its API surface is more complete.** `/risk/patients/{id}` (latest stored
score), `/risk/distribution` (counts per band), `/risk/calibration`
(predicted vs. observed, per band — the mechanism that would have caught
the miscalibration above in production), and `/risk/drivers` (global
feature importance as its own endpoint) all exist on main and not on this
branch.

**Its `artifact_path()` anchoring is identical to this branch's A17 fix** —
both independently resolve a relative `MODEL_ARTIFACT_DIR` against the
repository root rather than the process's working directory. Neither branch
copied the other; both hit the same bug in the shared M1 scaffold and fixed
it the same way. Noted for completeness, not counted as an advantage either
way.

## (b) Where this branch has something the reference does not

**Audit logging is implemented; the reference's is still the 24-line stub.**
`main`'s `backend/app/models/audit_log.py` is unchanged from the scaffold —
no writer, no tests. This branch's N1 (P2, repaired at A6/A7) records every
risk and patient-access request, corrects a guard-level "authorized" entry
to "denied" when row-level scoping rejects a request *after* the permission
check passes, and names the attempted patient even on a cross-scope denial.
For a platform whose brief explicitly frames this as a compliance
requirement, this branch has the only working implementation of it between
the two.

**The N3 ledger reports what did not work, not only what did.** This
branch's `ml/artifacts/n3_ledger.json` (committed at
`docs/06-milestones/evidence/n3-feature-ledger.json`) records five levers
tried, cross-validated, and four of them reverted — with the honest
methodological caveat (A14) that the screen was too weak to fully rule out
a small real effect. The reference's `train.py` does not show a comparable
per-lever record; its feature engineering (`add_utilisation_features`) is
applied outright, not screened and reported either way.

**The A16 serving-fidelity measurement and its root-cause writeup.** This
branch quantified, with real numbers against its own promoted artifact,
exactly how much the 7-vs-51 feature gap costs at serving time
(ROC-AUC 0.6534 → 0.5991, recall 0.5099 → 0.0994) and ranked the remaining
44 columns by the model's own aggregated importance to show what closing
that gap would actually require. The reference does not appear to have run
or published an equivalent measurement of its own serving behaviour — see
(c) below for why that may be because it did not need to.

**The mocking gap is disclosed, with a number attached.** This branch's P7
checkpoint states plainly that only 1 of 108 backend tests calls the real,
currently-trained model through the real endpoint, and names exactly which
of the other tests fake a success, which are inert, and which deliberately
simulate a failure. This is not a strength in the sense of "better code" —
it is a disclosed weakness the reference's own test suite was not checked
against in this comparison (out of scope here — only the four named files
were read on `main`). It is listed here because a report that states its
own gap this specifically is part of what this branch has that a silent
green suite does not.

## (c) The point that matters most

The reference **solved** the 7-vs-51 contract gap: it widened
`RiskPredictionRequest` to accept the model's real inputs and made the
response report its own coverage. This branch **measured** the same gap —
quantified exactly what it costs, ranked what would close it, and named the
cost of doing so — without changing the schema.

Both are real engineering. Solving it is the better outcome for anyone who
has to use this API today: a caller of the reference gets a materially
better prediction and can see how complete it was. Measuring it is a
narrower contribution: a precise, evidenced account of a gap, its cause,
and its remedy, useful to whoever decides to close it, but the gap itself
is still open in this branch's running code.

**If I were the reviewer, I would want the reference's `/risk/predict` in
front of a clinician tomorrow, and this branch's audit trail, N3 ledger, and
A16 analysis in front of me before deciding what to fix next.** The
reference is the stronger artifact for the stated job — scoring a real
admission — and that should be said plainly, not hedged: on the ML and API
design examined here, main is ahead of this branch. This branch's strength
is legibility about what is and is not true of its own system, including
findings (the calibration defect above) that only surfaced by reading the
better-designed reference and checking for the same failure here. Neither
of those things substitutes for the other; a reviewer choosing one artifact
to deploy would choose the reference, and a reviewer choosing one process to
trust with the next milestone's honesty would have more evidence for this
branch.
