# A16 — why the served model is not the model that was evaluated

**Bottom line, stated once, in the order it should be read in the report:**
the promoted model scores **ROC-AUC 0.5991 / recall 0.0994** on a real
request through the current API, not the **0.6534 / 0.5099** its offline
evaluation reported. Both numbers are true. They answer different
questions. Neither should be quoted alone.

---

## (a) The mechanism

`RiskPredictionRequest` (the JSON body `POST /risk/predict` accepts) collects
seven fields: `time_in_hospital`, `num_medications`, `num_lab_procedures`,
`number_diagnoses`, `number_inpatient`, `number_emergency`, `age_group`.

The trained pipeline (`ml/artifacts/readmission_model.joblib`) was fitted on
**51** columns — the full feature set N2/N3 built and leakage-proofed,
including the ICD-9 diagnosis codes, medical specialty, race, discharge
disposition, and 21 individual medication columns.

Every real request is therefore missing 44 of the 51 fields the model
expects. `model_service.predict_probability()` (fixed at N5 this milestone,
after a test against the real artefact found it crashing outright) fills
those 44 with the value the pipeline's own trained imputer would assign to
a **population-typical** patient — the training set's median for a numeric
column, its most frequent category for a categorical one. So every single
prediction the API has ever made is really: *"score this patient's 7
submitted values, and assume they are exactly average on everything else."*

## (b) Why recall collapses while accuracy rises

| | Accuracy | Recall | ROC-AUC |
|---|---|---|---|
| Offline (51 real features) | 0.6868 | 0.5099 | 0.6534 |
| As served (7 real, 44 imputed) | **0.8843** | **0.0994** | 0.5991 |

Accuracy went **up** by 20 points while the model got clinically worse. This
is the exact trap N4's own report names: the positive class (readmitted
within 30 days) is 8.98% of the dataset. A model that answers "no
readmission" for every single patient scores about 91% accuracy and catches
nobody. Once 44 of the model's strongest signals are replaced by
population-average defaults, the model has almost nothing patient-specific
left to distinguish a genuinely high-risk admission from a typical one, so
its predicted probabilities compress toward the population base rate. Most
patients — including most of the 9% who will actually be readmitted — no
longer cross the decision threshold. Recall falls to 0.0994: the model now
catches roughly **1 readmission in 10**, versus roughly 1 in 2 offline.
Accuracy rises for the same reason a model that never flags anyone scores
well on accuracy alone: predicting the majority class looks good on the one
metric that ignores how the classes are balanced, which is precisely why
this project reports all five metrics and not accuracy in isolation.

## (c) This is an API-contract defect, not a model defect

The artefact itself is not the problem. The identical pipeline, given the
same test rows with their real values, scores 0.6534 ROC-AUC / 0.5099
recall — the number already reported and promoted. Nothing about the
model's fit, its hyperparameters, or its training data changed between the
two measurements in this file; only how much of a real patient's data
reaches it at inference time changed. The gap lives entirely in the
distance between what `RiskPredictionRequest` asks a caller for and what
the model was actually trained on.

## (d) The remedy, ranked by the model's own feature importance

Using the same aggregation N6 built for the clinical-insights feature
(`cds_service._aggregate_importance_by_column`, which sums a fitted model's
per-output-column importance back onto its original 51 input columns), here
is where the model's weight actually sits. The current 7 `REQUEST_FEATURES`
account for **7.3%** of total importance combined. The next fields, ranked,
are where the highest-leverage additions are - though even the best of
them, taken together, still leave real ground uncovered (see the total
below the table):

| Rank | Field | Share of total importance | What a caller would have to supply |
|---|---|---|---|
| 1–3 | `diag_1`, `diag_2`, `diag_3` | 35.4% combined | The admission's primary/secondary/tertiary ICD-9 diagnosis codes |
| 4 | `medical_specialty` | 5.7% | Which specialty service admitted the patient |
| 5–7 | `diag_1_group`/`diag_2_group`/`diag_3_group` | 15.3% combined | The same three diagnoses, pre-grouped into ~9 clinical categories (Strack et al.) — a coarser, easier-to-supply alternative to the raw codes above |
| 8 | `age` (raw bracket) | 4.3% | The patient's age bracket as one of 10 bands (age_group, already collected, is a coarser 3-band version of this) |
| 9 | `race` | 2.7% | Patient race, as recorded in the source data |
| 12 | `discharge_disposition_id` | 2.0% | Coded discharge destination |
| remainder | `metformin`, `A1Cresult`, `insulin`, `max_glu_serum`, `diabetesMed`, and 29 more individual medication/lab/administrative columns | 27.3% combined across 34 columns, no single one above 2.1% | Whether each of 21 specific diabetes medications was prescribed/changed this stay, plus lab-result flags and admission/procedure counts |

Adding just the **raw** diagnosis codes and `medical_specialty` would move
the API from covering 7.3% of the model's importance to **48.4%** — the
single highest-leverage, lowest-field-count change available, but the one
demanding the hardest-to-supply field (see the cost note below).
Substituting the **grouped** diagnosis categories for the raw codes instead
reaches a smaller **28.3%** with a much easier ask. Either way, the
remaining gap after that is spread thinly across 34 columns, none
contributing more than about 2%: closing the *last* mile of the gap
requires a much longer form for a much smaller further gain per field.

The cost is real on both ends of that trade. The diagnosis codes are the
biggest lever and the hardest ask: a caller needs the admission's actual
ICD-9 codes on hand, which in practice means integrating with wherever
those codes are already recorded (the EHR's coding module), not typing them
into a risk-scoring form by memory. `medical_specialty`, `age`, `race`, and
`discharge_disposition_id` are ordinary structured admission fields most
systems already have at hand, a much smaller ask for a real share of the
gap. The remaining 34-column tail (individual medications, lab-result
flags, admission/procedure counts) would be the largest single addition to
the request schema by field count, for the smallest combined return per
field of any group here (27.3% spread across 34 columns, versus 5.7-35.4%
each for the fields ranked above it).

## (e) Why this was not fixed in this milestone

Closing this gap means redesigning `RiskPredictionRequest` — deciding which
of the fields above a caller can realistically supply, whether diagnosis
codes come from a coded lookup or free text, and what the frontend form (or
EHR integration) looks like to collect them. That is a schema and product
design decision with consequences for the frontend, the database, and
whoever calls this endpoint in practice — not a bug with a contained fix,
and not something to decide unilaterally mid-milestone. Milestone 2's stated
evaluation criteria (risk prediction and readmission forecasting
implemented, models functional, insights generated, integrated) are already
met by what P1–P6 built; expanding the request schema is future scope, to
be decided with the person who owns that trade-off, not invented here to
make a number look better. No schema change was made in this milestone.
