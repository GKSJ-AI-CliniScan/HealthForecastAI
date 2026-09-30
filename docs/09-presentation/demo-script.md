# Demonstration script

Ten to twelve minutes, four roles. Run it on the seeded demo data; never on real
patients. Sign-in accounts are created by `python -m app.db.init_db`; the shared
password is whatever `SEED_PASSWORD` was set to.

| Role | Email |
|---|---|
| Doctor | `dr.reddy@healthforecast.org` |
| Hospital administrator | `admin.ops@healthforecast.org` |
| Researcher | `researcher@healthforecast.org` |
| System administrator | `admin@healthforecast.org` |

Before starting: stack up (`docker compose up -d`), `curl localhost:8000/health` is
`ok`, and `pytest tests/e2e` passes. Have the deck open on slide 5.

## 1. The point (1 min)

> One in eleven patients is back within 30 days. We rank patients by risk, say why,
> suggest what to do, and keep a clinician in charge. Then we check ourselves
> honestly.

## 2. Doctor (3 min)

1. Sign in as the doctor. **Dashboard:** the numbers are the doctor's own caseload,
   not the hospital. Say so.
2. **Patients:** open a medium/high-risk patient.
3. Point at: probability, band, "x times the average patient".
4. **Suggested care actions:** each has a reason and the exact values from the
   record behind it ("33 medications recorded"). Read one aloud.
5. **What drives this score:** up arrows raise the risk, down arrows lower it. Note
   the caption: each factor is scored on its own, so the figures do not add up.
6. Point at the disclaimer. *These are illustrative rules for clinician review.*
7. **Treatment** tab: medication outcomes, adjusted odds ratio, and the yellow
   caveat that it is observational. "Stable recovery" is a proxy, and says so.

## 3. Hospital administrator (3 min)

1. Sign in as the administrator. Note the missing patient-level care actions: the
   role does not have them. Try `/clinical-support/rules` in the API docs: **403**.
2. **Performance:** the control chart. Explain the two red points at the end: not
   an improvement but right-censoring, which we found and partly corrected.
3. The observed-against-expected table. Cardiology is better than expected; most
   departments are "as expected"; the caveat says the model was fitted on this
   population so ratios are pulled toward 1.
4. **Export CSV.** Open it: aggregates only, no patient identifiers.

## 4. Researcher (2 min)

1. Sign in as the researcher: no patient list. Request it in the API docs: **403**.
2. Download the research dataset at `k=10`. Show `x-k-anonymity`,
   `x-suppressed-rows`. Rows are pseudonymised and sorted by pseudonym, not by
   insertion order.

## 5. System administrator and audit (1 min)

1. Users page. Everything just done is in the audit log: who opened which record,
   who exported what, with `k` recorded.

## 6. Security beat (1 min)

Sign in with a wrong password six times: the sixth response is **429** with a
`Retry-After` header, even if the password is right. The lockout itself is in the
audit log.

## 7. The honest close (1 min)

- Held-out ROC-AUC 0.63; 2.6x lift in the top band; predicted matches observed.
- Fairness gaps exist (recall by gender and age) and are reported, not fixed: that
  is a clinical decision.
- Not done: live cloud URL, clinical validation of the rules, httpOnly cookies.

## If something breaks

- **Empty pages:** the API is not reachable. `docker compose ps`; `curl :8000/health`.
- **"model_loaded": false:** `ml/artifacts/readmission_model.joblib` is missing.
- **Slow first page:** run `ANALYZE` (the scorer does this automatically after a load).
- **429 on sign-in:** wait 15 minutes, or use a different address; do not clear the
  audit log to work around it.
