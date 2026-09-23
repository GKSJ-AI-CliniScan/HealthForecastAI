# HealthForecast AI — Milestone 3 Design

**Document Version:** 1.0
**Scope:** Treatment Effectiveness Analysis, Outcome Analytics, Research Analytics
**Builds on:** `HealthForecastAI_Repository_Audit.md`, `HealthForecastAI_Gap_Analysis.md`, `HealthForecastAI_Milestone2_Design.md` (this milestone consumes Milestone 2's `risk_predictions` data)

---

## 0. Scoping Decision: Synthea

The Repository Audit found **zero Synthea-related code anywhere in the repository** — no FHIR parsing, no ETL, no `patient_journey_events` table. The ML/Database Design docs scope Synthea strictly as *enrichment* for this milestone (recovery-trend/care-plan detail the primary dataset lacks), never as a required dependency for core functionality.

**Recommendation: descope full Synthea integration from Milestone 3.** Building a FHIR-shape ingestion pipeline from zero, in a single 2-week solo milestone, on top of everything else this milestone already requires (treatment effectiveness, analytics dashboards, research views), is a significant net-new scope addition with no existing code to build on — unlike Milestone 2's ML pipeline, where real scaffold already existed. This milestone's design below is written to be **fully achievable using only the existing `treatment_outcomes`/`admissions`/`risk_predictions` tables**, with Synthea/`patient_journey_events` noted as an explicit "Known gap" / stretch goal in the milestone report, consistent with `INTERN_GUIDE.md`'s instruction that an honest "Known gaps" section beats a vague "everything works" claim. If time permits after the core deliverables below are done and tested, §5 sketches the minimal Synthea slice that would add the most value.

---

## 1. Treatment Effectiveness Analysis

### 1.1 Data foundation (already exists)

`treatment_outcomes` table (Repository Audit §6): `admission_id` (FK), `treatment_name`, `medication_change` (bool), `recovery_score` (float), `length_of_stay_days` (int), `outcome` (varchar). Currently populated by nothing — no service writes to it. This milestone's first task is wiring real reads/writes to a table that already has the right shape.

### 1.2 Required features

| Feature | Design |
|---|---|
| **Recovery Rate** | `AVG(recovery_score)` grouped by `treatment_name`, computed in `treatment_service.py` (currently empty) via a new `TreatmentRepository.recovery_rate_by_treatment()` query |
| **Treatment Success Rate** | `COUNT(outcome='improved') / COUNT(*)` grouped by `treatment_name` and optionally by department (joined through `admissions`) |
| **Readmission Reduction** | Cross-reference `treatment_outcomes.admission_id` against `admissions.readmitted` (or the extended `risk_predictions.actual_readmitted` from Milestone 2 §4.5) — compares readmission rate for patients who received a given treatment vs. hospital baseline |
| **Treatment Comparison** | Side-by-side query: for a given `primary_diagnosis`, compare recovery rate / success rate / readmission rate across the distinct `treatment_name` values applied to that cohort |

### 1.3 Service design

```python
# backend/app/services/treatment_service.py (currently empty stub — this replaces it)
class TreatmentService:
    def record_outcome(self, admission_id: int, data: TreatmentOutcomeCreate) -> TreatmentOutcome: ...
    def recovery_rate(self, treatment_name: str | None, department: str | None) -> RecoveryRateResult: ...
    def success_rate(self, treatment_name: str | None) -> SuccessRateResult: ...
    def readmission_reduction(self, treatment_name: str) -> ReadmissionReductionResult: ...
    def compare_treatments(self, diagnosis: str) -> list[TreatmentComparisonRow]: ...
```

Every read/write follows the existing audit-logging convention (`AuditRepository.record(...)`, already used by every other service — no new pattern introduced).

### 1.4 API design

| Endpoint | Method | Auth | Request | Response | Errors |
|---|---|---|---|---|---|
| `POST /api/v1/patients/{id}/admissions/{admission_id}/treatments` | POST | Doctor (own scope), system_admin | `{ "treatment_name": str, "medication_change": bool, "recovery_score": float, "outcome": str }` | `201`, created row | `404` admission not found/out of scope; `422` invalid `outcome` enum |
| `GET /api/v1/treatment` *(existing stub — replace body)* | GET | Doctor, hospital_admin, researcher (per SRS §9: "Treatment Effectiveness Reports: Yes" for all 3 clinical roles) | Query params: `treatment_name?`, `department?` | `[ {treatment_name, recovery_rate, success_rate, sample_size} ]` | `400` invalid filter combination |
| `GET /api/v1/treatment/recovery-trends` *(existing stub — replace body)* | GET | Same | Query params: `treatment_name?`, `weeks=12` | `[ {week_start, avg_recovery_score, n} ]` | — |
| `GET /api/v1/treatment/compare?diagnosis=X` | GET | Same | — | `[ {treatment_name, recovery_rate, success_rate, readmission_rate, n} ]` | `422` if diagnosis has <5 recorded treatments (avoid misleading small-sample comparisons — mirrors the SRS's re-identification-risk guard pattern used for research export) |

---

## 2. Outcome Analytics

### 2.1 Required features

| Feature | Design |
|---|---|
| **Department Analytics** | `admissions.department`-equivalent grouping — **note:** the current `admissions` table (Repository Audit §6) does not have a `department` column; it has `admission_type`. Add `department VARCHAR(100)` in this milestone's migration if department-level reporting is required, or repurpose `admission_type` if "department" in the brief maps loosely to admission type in this dataset. Recommend adding the column — it is a one-line migration and the brief's Admin dashboard explicitly needs "Monitor department performance." |
| **Outcome Trends** | Time-bucketed (`DATE_TRUNC('month', discharge_date)`) aggregation of `treatment_outcomes.outcome` distribution |
| **Risk Trends** | Already possible using Milestone 2's `risk_predictions` history — `GET /risk/forecast` (extended in M2) already covers this; M3 adds a longer-range, department-segmented view |
| **Treatment Trends** | Time-bucketed `recovery_rate`/`success_rate` per treatment, reusing §1's queries with a `GROUP BY month` |

### 2.2 Materialized views (per Database Design §9.3, not yet implemented anywhere)

```sql
CREATE MATERIALIZED VIEW mv_department_outcome_summary AS
SELECT
    a.department,
    DATE_TRUNC('month', a.discharge_date) AS month,
    COUNT(*) AS admission_count,
    AVG(t.recovery_score) AS avg_recovery_score,
    SUM(CASE WHEN a.readmitted IS NOT NULL AND a.readmitted != 'NO' THEN 1 ELSE 0 END)::float
        / NULLIF(COUNT(*), 0) AS readmission_rate
FROM admissions a
LEFT JOIN treatment_outcomes t ON t.admission_id = a.id
GROUP BY a.department, DATE_TRUNC('month', a.discharge_date);
```

Refreshed on-demand (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) rather than on a cron for this milestone's scope — a scheduled refresh job is a Milestone 4 operational concern, not a functional requirement.

### 2.3 API design

| Endpoint | Method | Auth | Response |
|---|---|---|---|
| `GET /api/v1/analytics/summary` *(existing stub — replace)* | GET | hospital_admin (full), doctor (limited), researcher (aggregated), system_admin (full) — per SRS §9 RBAC matrix row "Hospital Analytics Dashboard" | `HospitalAnalyticsSummary` shape (type already defined in frontend, currently unused) |
| `GET /api/v1/analytics/readmissions` *(existing stub — replace)* | GET | Same tiered access | `[ {department, month, readmission_rate} ]` from `mv_department_outcome_summary` |
| `GET /api/v1/analytics/outcomes` *(new)* | GET | Same | Outcome distribution cross-tabulated vs. treatment, per FR-ANL-02 |
| `GET /api/v1/analytics/trends?metric=risk|treatment|outcome` *(new)* | GET | Same | Unified trend-chart data endpoint — one shape for all three trend chart types on the Admin dashboard, avoiding three near-duplicate endpoints |

**RBAC nuance carried over from SRS §9:** Doctor gets "Limited" access to the Hospital Analytics Dashboard — implement as an automatic `department` filter scoped to the departments of the doctor's assigned patients, not a separate endpoint.

---

## 3. Research Analytics

### 3.1 Fixing the existing dead code

`backend/app/utils/anonymisation.py` already has a working `pseudonymise()` (SHA-256-based) function that nothing calls. `GET /patients/anonymised` already exists as a route returning hardcoded `[]`. This milestone's highest-value, lowest-effort task is simply **wiring the two together** — no new anonymisation logic needs to be designed.

```python
# backend/app/api/v1/endpoints/patients.py — replace the stub body
@router.get("/anonymised")
def list_anonymised_patients(...):
    patients = patient_service.list_for_research(filters)
    return [anonymise_patient(p) for p in patients]  # uses existing pseudonymise()
```

`anonymise_patient()` (new, thin wrapper in `anonymisation.py`): drops `medical_record_number`/any direct identifier, generalizes `age_group` if not already banded, replaces `id` with `pseudonymise(id)`.

### 3.2 Re-identification-risk guard (per SRS Use Case "Export Anonymized Research Dataset")

```python
MIN_COHORT_SIZE = 10  # configurable

def list_for_research(self, filters) -> list[Patient]:
    results = self._query(filters)
    if len(results) < MIN_COHORT_SIZE:
        raise CohortTooSmallError(size=len(results), minimum=MIN_COHORT_SIZE)
    return results
```
Maps to `422` with `{"error": "cohort_too_small", "minimum": 10, "actual": 4}` — mirrors the error-shape convention already used elsewhere (§1.4's diagnosis-comparison guard uses the same pattern deliberately, for consistency).

### 3.3 Required features

| Feature | Design |
|---|---|
| **Aggregated Data** | `GET /analytics/population-health` *(existing stub — replace)* — condition prevalence, regional trends, generalized age-band distributions, all pre-aggregated server-side (never row-level) |
| **Anonymized Data** | §3.1/§3.2 above |
| **Research Reports** | Reuses the aggregated-data endpoints; a distinct "export" affordance is a Reporting-module concern (§4) rather than a separate analytics feature |
| **Population-Level Insights** | Same `mv_department_outcome_summary` view (§2.2) queried with identifiers stripped, satisfying "Aggregated Only" access for the Researcher role per SRS §9 |

### 3.4 API design

| Endpoint | Method | Auth | Response |
|---|---|---|---|
| `GET /api/v1/patients/anonymised` *(existing stub — replace)* | GET | Researcher, system_admin | List of `AnonymisedPatient` (no MRN, no name if any exists, generalized age) |
| `GET /api/v1/analytics/population-health` *(existing stub — replace)* | GET | Researcher, hospital_admin, system_admin | Condition prevalence + regional aggregates |
| `GET /api/v1/analytics/research-export` *(new)* | GET | Researcher, system_admin | Downloadable anonymized dataset (CSV) — thin composition of §3.1 + §3.2, not new logic |

---

## 4. Reporting Module (minimum viable, supports §1-3 above)

Not explicitly re-scoped from the Project Brief's Milestone 3 list, but SRS FR-RPT-01..03 and the brief's "Generate patient outcome analytics reports" outcome both point here. Minimum viable slice for this milestone:

```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    generated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    format VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'pdf')),
    file_path VARCHAR(500) NOT NULL,
    filters JSONB,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **Scope for M3:** CSV export only (trivial with `pandas.DataFrame.to_csv()`, already a backend dependency). PDF export is explicitly deferred to Milestone 4 polish — it requires a templating library not currently in `requirements.txt`, and CSV alone satisfies the Researcher/Administrator export permission rows in the RBAC matrix.
- `GET /api/v1/reports/export?type=treatment_effectiveness&format=csv` → generates, stores under a local `reports/` object-storage-equivalent directory (S3/Blob is a Milestone 4 deployment concern), returns `{"report_id": 1, "download_url": "/api/v1/reports/1/download"}`.
- `GET /api/v1/reports/{id}/download` → streams the file, permission-checked against `generated_by` + role.

---

## 5. Minimal Synthea Slice (stretch goal, only if §1-4 are done and tested first)

If time remains, the smallest useful increment is **not** a full FHIR ETL — it's a single new table plus a hand-written seed script using a handful of pre-generated Synthea sample JSON files (Synthea ships public sample exports; no need to run the generator):

```sql
CREATE TABLE patient_journey_events (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL
        CHECK (event_type IN ('encounter','condition','medication','procedure','observation','care_plan')),
    event_date TIMESTAMPTZ,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_journey_patient ON patient_journey_events(patient_id);
CREATE INDEX idx_journey_payload_gin ON patient_journey_events USING GIN (payload);
```

A single `scripts/import_synthea_sample.py` mapping ~5 Synthea resource types into rows, used only to demo the Treatment Effectiveness module's "medication effectiveness assessment" with richer data than `treatment_outcomes` alone provides. **This is explicitly optional** — none of §1-4's endpoints depend on this table existing.

---

## 6. Dashboard Additions (extends Milestone 2 §7)

- **Hospital Administrator dashboard** (`dashboard/analytics/page.tsx`, created in M2): add a "Treatment Effectiveness" tab consuming §1.4's endpoints, and a "Department Performance" tab consuming §2.3.
- **Researcher dashboard**: currently the Researcher role shares the generic patient-list view with an error-message-only differentiation (Repository Audit §8). This milestone adds the first genuinely distinct view: a new `dashboard/research/page.tsx` route (gated by `can(user, 'analytics:research_read')` — new permission, added to `rbac.py`'s existing matrix pattern) showing only §3's aggregated/anonymized endpoints, never the row-level patient list.
- **Doctor dashboard**: add a "Treatment Outcomes" section to `dashboard/patients/[id]/page.tsx` showing that patient's `treatment_outcomes` history alongside the risk/CDS card added in Milestone 2.

---

*End of HealthForecastAI_Milestone3_Design.md*
