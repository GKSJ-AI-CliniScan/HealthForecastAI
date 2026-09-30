# Milestone 3 report - Week 5 & 6 - Treatment Effectiveness Analysis & Healthcare Analytics

- **Branch:** `main` (reference implementation)
- **Submitted on:** 2026-09-30

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

## What I built

### Data changes that had to come first

The Milestone 1 schema held admissions but nothing about *treatment*. Migration
`0032e1b3059c` extends the `treatment_outcomes` table (one row per medication per
admission, with the dose change), the outcome columns the reports need (`a1c_result`,
`medication_changed`, `department`, prior-visit counts) and CHECK constraints.
The ETL loads 74,799 treatment rows from the 23 medication columns of the source
data. `alembic check` reports no drift between the models and the migration.

### Analytics modules (backend)

| Module | What it does |
|---|---|
| `services/stats.py` | Wilson intervals, Mantel-Haenszel stratified odds ratio, exact Poisson interval, observed/expected ratio, p-chart limits. Checked against statsmodels in `tests/test_stats.py` (24 tests). |
| `services/treatment_service.py` | Medication outcome analysis and recovery reports, scoped in SQL to a doctor's caseload. |
| `services/performance_service.py` | Risk-adjusted performance by department or diagnosis group, and trend monitoring. |
| `services/cds_service.py` | 14 transparent recommendation rules and a discharge plan. |
| `services/explain_service.py` | Per-patient "what drives this score". |
| `services/reports_service.py` | Patient outcome report, hospital performance CSV, k-anonymous research dataset. |

### Endpoints (14 new)

Treatment: `/treatment`, `/treatment/recovery`, `/treatment/recovery-trends`,
`/treatment/medications/{name}` and `/treatment/care-processes`. Analytics:
`/analytics/performance`,
`/analytics/performance-dimensions`, `/analytics/trends`. Clinical support:
`/clinical-support/recommendations/{id}`, `/discharge-plan/{id}`, `/rules`.
Reports: `/reports/patients/{id}/outcome`, `/reports/hospital-performance`,
`/reports/research-dataset`. The role-by-endpoint matrix test covers the main ones; scoping, audit and privacy behaviour have their own tests.

### Frontend

`/treatment` (medication outcomes and recovery), `/performance` (control chart,
observed-against-expected table, CSV export) and, on the patient page, suggested
care actions with the factors behind the score.

---

## How to run it

```bash
docker compose up -d postgres mongodb
cd backend && alembic upgrade head && SEED_PASSWORD='<choose one>' python -m app.db.init_db
cd ../ml && python -m src.data.etl && python -m src.models.train && python -m src.models.score
cd ../backend && uvicorn app.main:app --reload      # http://localhost:8000/docs
cd ../frontend && npm ci && npm run dev             # http://localhost:3000
```

Tests: `pytest` in `backend/` (242) and `ml/` (58).

## Evidence

**Medication outcomes are adjusted, and the adjustment matters.** Insulin
patients readmit at 10.1% against 8.6% for the rest (crude odds ratio 1.20).
After stratifying by age band and prior inpatient visits the odds ratio is 1.22
(1.15-1.29): the sicker patients get insulin, and the association survives
adjustment. It is reported as an association, not an effect: the report says so
on the page.

**Recovery is a proxy and labelled as one.** The source data has no clinical
recovery score. "Stable recovery" is *not readmitted within 30 days and
discharged home*: 69.0% overall (95% CI 68.6-69.4%), 89.4% in the 0-10 age band
against lower rates in older groups.

**Performance is observed against expected.** Expected readmissions are the sum
of the model's predicted probabilities. Overall 5,894 observed against 5,923
expected (ratio 0.995). Cardiology runs better than expected (288 against 324);
most departments are "as expected". Groups under 11 patients are suppressed.

**Trend monitoring flags a real artifact.** The p-chart puts the last two of
ten cohorts *below* the lower control limit (8.1% and 7.8% against 8.3%). That is
not an improvement in care: the source has no dates, so the newest encounters
have had less follow-up and cannot show a readmission yet (right-censoring).
Discovering this is why the cohort now drops the newest 10% of encounters
(`follow_up_buffer_fraction`), with a sensitivity table in `config.yaml`. The
buffer removed most of the effect but not all of it, and the residual signal is
left visible rather than tuned away.

**Audit.** Every read of a patient record, every export and every report
generation writes an audit row (`tests/test_audit.py`).

## Metrics

| Measure | Value |
|---|---|
| Cohort after cleaning | 62,991 patients (was 69,990 before the follow-up buffer) |
| 30-day readmission rate | 9.36% |
| Promoted model | XGBoost v2026.09.30.0717, threshold 0.1012 |
| Held-out ROC-AUC | 0.633 (95% CI 0.618-0.650) |
| Recall / precision at threshold | 0.501 / 0.142 |
| Calibration on test | high band 24.7% observed vs 24.6% predicted (2.6x baseline) |
| Backend / ML tests | 242 / 58 passing, ruff and black clean |
| Frontend | `tsc`, `next lint` and `next build` clean |
| New endpoints | 14 |

Race and gender are excluded from the model's inputs.

## Known gaps

- **Fairness gaps exist and are not fixed.** Recall is 0.446 for men against
  0.551 for women, and 0.340 for the 40-50 age group against 0.475-0.571 for
  60+. Race recall is within noise. Details, with the cutoff that would close
  each gap and its cost in precision, are in
  [`docs/07-testing/fairness-audit.md`](../07-testing/fairness-audit.md).
  Closing them needs a clinical decision about the trade-off, not a code change.
- **The recommendation rules are illustrative.** Thresholds such as "follow up
  within 7 days" are reasonable defaults and are published at
  `/clinical-support/rules`, but they have not been clinically validated. Every
  output says a clinician must review it.
- **The per-patient explanation is not additive.** XGBoost has no exact
  attribution on the displayed probability. Each factor is scored by occlusion
  (the drop in score if only that factor took a typical value); the figures do
  not sum to the total, and the page says so. TreeSHAP was tried first and
  rejected: the model is class-weighted, so its baseline is not the average
  patient and it pointed the opposite way to the displayed risk.
- **The Risk page's calibration table is in-sample** (it scores patients the
  model was trained on), so it looks sharper than reality; it carries a caveat
  and the held-out figures are in `artifacts/validation.json`.
- **Department comparisons make many comparisons at once**; with 20+ groups a
  few will be flagged by chance. Alert and alarm tiers (95% / 99.8%) are the
  planned fix. Similarly the p-chart applies the 3-sigma rule only, not the
  run rules for a steady drift.
- **Trends are by encounter sequence, not calendar month**, because the source
  data has no dates. A deployment with admission dates would trend monthly.
- **Model performance is modest** (ROC-AUC 0.63), in line with the published
  0.63-0.68 for this dataset. It ranks patients better than chance and better
  than the "prior inpatient stays" rule (0.54), but it is a triage aid, not a
  diagnosis.
