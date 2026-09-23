# HealthForecast AI — Milestone 2 Design

**Document Version:** 1.0
**Scope:** Patient Risk Intelligence, Readmission Prediction, ML Pipeline, Backend ML Integration, API Design, Clinical Insights Engine, Doctor/Admin Dashboards
**Builds on:** `HealthForecastAI_Repository_Audit.md`, `HealthForecastAI_Gap_Analysis.md`
**Assumption (per Gap Analysis §5):** PostgreSQL-only; India Hospital Readmission Dataset primary, Diabetes 130-US as fallback/bootstrap. If the mentor instead ratifies the reverse, every schema/API shape below is unaffected — only the feature-engineering column mapping in §3 changes.

---

## 1. Patient Risk Intelligence

### 1.1 Required output contract (per Project Brief)

```json
{
  "risk_score": 0.87,
  "risk_level": "HIGH"
}
```

### 1.2 Full response shape (extends the brief's minimal contract to satisfy SRS FR-RISK-01..04 and ML Design §12-13)

```json
{
  "prediction_id": "uuid",
  "patient_id": 123,
  "risk_score": 0.87,
  "risk_level": "HIGH",
  "contributing_factors": [
    "3 prior admissions in the last 12 months",
    "Length of stay above department median",
    "5 concurrent discharge medications"
  ],
  "model_name": "risk_xgboost",
  "model_version": "1.0.0",
  "prediction_date": "2026-09-22T10:15:00Z"
}
```

- `risk_level` thresholds (from ML Design §12.1, already pinned in `ml/configs/config.yaml` and `ml/src/evaluation/metrics.py:categorise_risk`): Low 0.00–0.39, Medium 0.40–0.69, High 0.70–1.00. These must stay in sync between `ml/` and the backend — currently only a code comment enforces this; §4 adds a shared-constant fix.
- **Risk Score Generation:** calibrated probability from the primary XGBoost classifier (Platt/isotonic calibration applied if the raw output is not well-calibrated, verified via a reliability curve during evaluation).
- **Risk Classification:** threshold-mapped tier, stored immutably per-prediction (a later threshold retune must never rewrite historical `risk_category` values).
- **High-Risk Detection:** `GET /risk/high-risk` queries `risk_predictions WHERE risk_category = 'high' AND created_at = (latest per patient)`, scoped by caller role exactly like `PatientRepository.scope_clause()`.
- **Risk Trend Monitoring:** `risk_predictions` is already an append-only, timestamped table (`idx_risk_patient_created` composite index exists) — trend tracking is a `GET /risk/{patient_id}/history` query against existing schema, no new table needed.

---

## 2. Readmission Prediction

### 2.1 Required output contract (per Project Brief)

```json
{
  "readmission_probability": 0.81,
  "predicted_readmission": true
}
```

### 2.2 Full response shape

```json
{
  "prediction_id": "uuid",
  "patient_id": 123,
  "admission_id": 456,
  "readmission_probability": 0.81,
  "predicted_readmission": true,
  "risk_category": "High",
  "confidence_score": 0.78,
  "readmission_window": "30_day",
  "model_name": "readmission_xgboost",
  "model_version": "1.0.0",
  "prediction_date": "2026-09-22T10:15:00Z"
}
```

- **30-Day Readmission Prediction:** `predicted_readmission = readmission_probability >= decision_threshold` (threshold tunable per model version, stored in `model_metadata`, default 0.5).
- **Probability Estimation:** same XGBoost pipeline as risk scoring but trained against the `readmitted` label with a 30-day window filter, per ML Design §6.10 temporal split strategy.
- **Readmission Risk Classification:** reuses the same Low/Medium/High banding as §1.2 for UI consistency (one risk vocabulary across both prediction types, per SRS §9's unified "Risk Prediction Reports" / "Readmission Forecasts" RBAC rows).

### 2.3 Relationship between the two predictions

The existing `risk_predictions` table (7-column schema, audited in the Repository Audit §6) already has a shape general enough to hold both prediction types **if extended**, avoiding the Database Design doc's separate `predictions`/`readmission_records` split, which would require a larger migration than Milestone 2's timebox allows. Recommended minimal-diff migration:

```sql
ALTER TABLE risk_predictions
    ADD COLUMN prediction_type VARCHAR(20) NOT NULL DEFAULT 'risk'
        CHECK (prediction_type IN ('risk', 'readmission')),
    ADD COLUMN readmission_probability FLOAT
        CHECK (readmission_probability IS NULL OR readmission_probability BETWEEN 0 AND 1),
    ADD COLUMN confidence_score FLOAT
        CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
    ADD COLUMN readmission_window VARCHAR(10)
        CHECK (readmission_window IS NULL OR readmission_window IN ('30_day', '90_day'));

CREATE INDEX idx_risk_predictions_type ON risk_predictions(prediction_type, created_at DESC);
```

This keeps one table, one repository, one service — consistent with the "don't introduce abstractions beyond what's needed" principle, and avoids a second nearly-identical table. If the team later needs the full Database Design table set (e.g., for Milestone 4 audit rigor), a follow-up migration can split them; nothing in the API contract above forces a particular table shape.

---

## 3. ML Pipeline Design

Current `ml/` pipeline stages (per Repository Audit §7) are real code, Diabetes-130-US-shaped, never executed. This section specifies what changes for Milestone 2.

| Stage | Current state | Milestone 2 change |
|---|---|---|
| **Data Validation** | `preprocess.py` has leakage-safe filtering (expired/hospice removal) | Add India Hospital Readmission validators: `discharge_date >= admission_date`, plausible age/length-of-stay ranges, per SRS §11 — mirrors checks already in `dataset_import_service.py`'s India profile, so this is mostly porting existing validation logic into `ml/src/data/validate.py` (new file) rather than writing it from scratch |
| **Data Cleaning** | `basic_clean()` — Diabetes-specific | Add an `india_hospital_readmission` cleaning path alongside the existing Diabetes path in the same module, selected by `config.yaml: dataset.profile` — mirrors the dual-profile pattern already proven in `dataset_import_service.py` |
| **Feature Engineering** | `build_features.py` — utilisation features, one-hot/target encoding via `ColumnTransformer` | Add demographic/clinical/admission/treatment/historical feature groups per ML Design §7 (age band, region frequency-encoding, diagnosis frequency-encoding, admission type one-hot, prior-admission count, days-since-last-discharge) |
| **Training Pipeline** | `train.py` reads raw CSV directly | **Change data source to PostgreSQL** — read from `patients`/`admissions` via a read-only DB connection (reusing `backend/app/db/session.py`'s engine config or a standalone `ml/src/data/db_source.py`), so the same rows the backend imported are what gets trained on. This is the single most important wiring fix identified in the Gap Analysis. |
| **Evaluation Pipeline** | `metrics.py` — accuracy/precision/recall/F1/ROC-AUC, promotion-threshold check | Update `config.yaml` thresholds to the ML Design doc's stated targets: `roc_auc: 0.75`, add `f1_high_risk: 0.70` as a second gating metric (currently only `recall: 0.50` is checked) |
| **Inference Pipeline** | `predict.py` — loads joblib, scores a dataframe | Wrap as a stateless `RiskPredictionEngine` class (see §5) callable from FastAPI without a subprocess |
| **Model Registry** | None | New `model_metadata` table (see §3.1) + registration step at the end of `train.py` |
| **Model Versioning** | File-based only (`readmission_model.joblib` gets overwritten each run) | Version-suffixed artifact filenames (`readmission_xgboost_v{n}.joblib`) + `model_metadata` row per run, `status` lifecycle `staged → production → retired` |

### 3.1 New table: `model_metadata`

```sql
CREATE TABLE model_metadata (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    algorithm VARCHAR(50) NOT NULL CHECK (algorithm IN ('xgboost', 'random_forest', 'logistic_regression')),
    accuracy FLOAT CHECK (accuracy IS NULL OR accuracy BETWEEN 0 AND 1),
    precision_score FLOAT CHECK (precision_score IS NULL OR precision_score BETWEEN 0 AND 1),
    recall FLOAT CHECK (recall IS NULL OR recall BETWEEN 0 AND 1),
    f1_score FLOAT CHECK (f1_score IS NULL OR f1_score BETWEEN 0 AND 1),
    roc_auc FLOAT CHECK (roc_auc IS NULL OR roc_auc BETWEEN 0 AND 1),
    artifact_path VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'production', 'retired', 'rejected')),
    trained_at TIMESTAMPTZ NOT NULL,
    promoted_at TIMESTAMPTZ,
    promoted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(model_name, version)
);
CREATE INDEX idx_model_metadata_status ON model_metadata(model_name, status);
```

### 3.2 Model selection — justification (not a blind recommendation)

| Model | Role | Why |
|---|---|---|
| **XGBoost** | Primary production classifier (risk + readmission) | Already selected and configured in `ml/configs/config.yaml`; native missing-value handling reduces pipeline fragility on real-world hospital data with incomplete fields; built-in L1/L2 regularization directly mitigates the "overfitting to historical dataset" risk the SRS flags; strong published track record on tabular clinical readmission tasks. No reason to deviate from work already done. |
| **Random Forest** | Feature-importance validator + drift-comparison baseline | Already configured; its bagged-tree structure is naturally overfitting-resistant on this dataset's moderate feature count, and its feature-importance output is the direct input to the "contributing factors" field in §1.2 — this is not decorative, it is load-bearing for the explainability-lite requirement (ML Design M3). |
| **Logistic Regression** (already present, extra to the design doc) | Sanity-check baseline only | Not part of the ML Design's final selection, but cheap to keep as a lower bound during evaluation — if XGBoost fails to beat it, that signals a pipeline bug rather than a genuine model limitation. Keep, but never promote it to production. |

Deep learning / neural approaches remain explicitly out of scope per ML Design §16 — this dataset's size and the interpretability requirement both argue against them, and nothing in the current gap analysis changes that judgment.

### 3.3 ML directory design

The existing `ml/` layout already matches the brief's suggested shape closely; the table below maps brief-suggested folders to what already exists vs. what Milestone 2 adds.

| Folder | Exists today | Responsibility | M2 additions |
|---|---|---|---|
| `ml/data/` | Yes (`raw/`, `processed/`, `external/`, `README.md`) | Raw dataset staging (gitignored) + fetch documentation | Add India Hospital Readmission fetch instructions alongside Diabetes |
| `ml/features/` | Not present as a folder — logic lives in `ml/src/features/` | Feature engineering | No structural change needed; `src/features/build_features.py` already serves this role |
| `ml/training/` | Not present as a folder — logic lives in `ml/src/models/train.py` | Model training | No structural change needed |
| `ml/evaluation/` | Present as `ml/src/evaluation/` | Metrics, promotion gating | Add `f1_high_risk` gating (§3 table) |
| `ml/inference/` | **New** — currently inference logic is `ml/src/models/predict.py`, imported directly by nothing outside `ml/tests/` | Stateless prediction engine consumed by the backend | New `ml/src/inference/engine.py` wrapping `predict.py` behind a class interface (§5) |
| `ml/artifacts/` | Present, empty | Versioned model binaries | Populate via `train.py`'s new versioned-filename output |
| `ml/configs/` | Present (`config.yaml`) | Hyperparameters, thresholds, dataset profile selector | Add `dataset.profile` key, corrected promotion thresholds |
| `ml/notebooks/` | Present, empty (hygiene README only) | Optional EDA | Not required for M2; skip unless time permits |
| `ml/tests/` | Present, 3 files | Pipeline correctness | Add a `test_train_end_to_end.py` that trains on a tiny synthetic fixture (not the real dataset) to catch pipeline regressions without requiring the real CSV/DB in CI |

**Note:** the brief's suggested top-level `ml/features/`, `ml/training/`, `ml/evaluation/` folders are *conceptually* satisfied by the existing `ml/src/{features,models,evaluation}/` structure — renaming working, tested modules purely for folder-name cosmetics is not recommended; it would touch every import path for zero functional gain.

---

## 4. Backend ML Integration — `backend/app/services/ml/`

The brief calls for `backend/app/services/ml/risk_service.py` and `readmission_service.py`. The current repo has `backend/app/services/risk_service.py` (flat, not under an `ml/` subpackage) containing only `categorise_risk()`. Recommended structure:

```
backend/app/services/
├── risk_service.py            # existing file, extended (not moved — see note below)
├── readmission_service.py     # new
└── ml/
    ├── __init__.py
    ├── model_loader.py         # loads/caches the current-production model from ml/artifacts/
    └── feature_builder.py      # assembles a patient's feature vector from patients/admissions tables
```

**Note on not moving `risk_service.py`:** it is imported by `ml/src/evaluation/metrics.py`'s own docstring sync-comment and by existing passing tests (`test_risk_service.py`). Moving it into a new `ml/` subpackage is a pure-churn rename that breaks working imports for no behavioral gain — extend it in place instead, and put only the *new* model-loading/feature-building code under `services/ml/`.

### 4.1 `services/ml/model_loader.py`

```python
class ModelLoader:
    """Loads the current-production model artifact, cached per process."""
    def get_active_model(self, model_name: str) -> Pipeline: ...
    def refresh(self) -> None:  # invalidate cache after a promotion
```
- Responsibility: single source of truth for "which artifact is currently live," backed by `model_metadata.status = 'production'`.
- Data flow: `model_metadata` row → `artifact_path` → `joblib.load()` → cached in-process (avoids reloading on every request, satisfies the ≤2s p95 latency NFR).

### 4.2 `services/ml/feature_builder.py`

```python
class FeatureBuilder:
    def build_for_patient(self, patient_id: int, admission_id: int | None = None) -> pd.DataFrame: ...
```
- Responsibility: read a single patient's (+ optionally a specific admission's) rows from `patients`/`admissions`, apply the *same* cleaning/encoding steps as training (imported from `ml/src/features/build_features.py` — the backend depends on `ml/` as a library, not a reimplementation, to avoid train/serve skew).
- Data flow: DB row(s) → pandas DataFrame → `ColumnTransformer.transform()` (loaded from the model artifact bundle, not refit) → feature vector ready for `model.predict_proba()`.

### 4.3 `risk_service.py` (extended)

```python
class RiskService:
    def __init__(self, loader: ModelLoader, features: FeatureBuilder, repo: RiskPredictionRepository): ...
    def score_patient(self, patient_id: int) -> RiskPredictionResult:
        """Builds features, runs inference, persists, returns the response shape in §1.2."""
    def categorise_risk(self, probability: float) -> str:  # existing, unchanged
    def get_history(self, patient_id: int) -> list[RiskPredictionResult]: ...
    def list_high_risk(self, scope: PatientScope) -> list[RiskPredictionResult]: ...
```

### 4.4 `readmission_service.py` (new)

```python
class ReadmissionService:
    def __init__(self, loader: ModelLoader, features: FeatureBuilder, repo: RiskPredictionRepository): ...
    def predict_readmission(self, patient_id: int, admission_id: int) -> ReadmissionPredictionResult:
        """Same flow as RiskService.score_patient but prediction_type='readmission'."""
    def record_outcome(self, prediction_id: str, actual_readmitted: bool) -> None:
        """FR-READM-04 feedback logging — writes to a new lightweight outcomes column/table, see §4.5."""
```

### 4.5 Minimal `prediction_outcomes` addition

Rather than the Database Design's full separate table, extend `risk_predictions` (consistent with §2.3's one-table decision):

```sql
ALTER TABLE risk_predictions
    ADD COLUMN actual_readmitted BOOLEAN,
    ADD COLUMN outcome_recorded_at TIMESTAMPTZ;
```

A `NULL` in `actual_readmitted` means "not yet resolved" (the natural state for most rows, since outcomes only become known after the readmission window elapses).

### 4.6 New repository: `RiskPredictionRepository`

Mirrors the existing `PatientRepository`/`AdmissionRepository` pattern (`backend/app/repositories/risk_prediction_repository.py`): `create()`, `get_latest_for_patient()`, `list_high_risk(scope)`, `history_for_patient()`, `record_outcome()`.

---

## 5. API Design

All endpoints require `Authorization: Bearer <JWT>` (existing `get_current_active_user` dependency) plus the stated permission. Error shapes follow the existing `ApiError`/`HTTPException` convention already used by `patients.py`/`admissions.py` — no new error-handling pattern introduced.

### `POST /api/v1/risk/predict`
*(Currently exists as a hardcoded stub — this design replaces its body, not its route/signature.)*

| | |
|---|---|
| Method | POST |
| Auth | `Permission.RISK_READ` scoped to doctor/hospital_admin/system_admin (matches existing `risk.py` gating) |
| Request | `{ "patient_id": 123 }` |
| Response 200 | Shape in §1.2 |
| Validation | `patient_id` must exist and be in caller's scope (reuse `patient_scope_for` dependency) |
| Errors | `404` patient not found/out of scope; `422` insufficient feature data (`{"error": "insufficient_patient_data", "missing_fields": [...]}`); `500` model load/inference failure |

### `GET /api/v1/risk/{patient_id}`
| | |
|---|---|
| Method | GET |
| Auth | Same as above |
| Response 200 | Most recent prediction, §1.2 shape, or `404` if none exists yet (client may then call `POST /risk/predict`) |

### `GET /api/v1/risk/{patient_id}/history`
| | |
|---|---|
| Method | GET |
| Auth | Same as above |
| Response 200 | `[ {...§1.2 shape...}, ... ]` ordered by `prediction_date DESC` — powers Risk Trend Monitoring |

### `GET /api/v1/risk/high-risk`
*(Replaces the existing hardcoded-`[]` stub.)*
| | |
|---|---|
| Method | GET |
| Auth | Scoped — doctor sees only assigned patients' high-risk entries, admin/system_admin see hospital-wide |
| Response 200 | `[ {...§1.2 shape, plus patient summary fields...} ]` |

### `POST /api/v1/predictions/readmission`
*(New — replaces the need to overload `/risk/forecast` for per-patient predictions.)*
| | |
|---|---|
| Method | POST |
| Auth | Same role gate as risk prediction |
| Request | `{ "patient_id": 123, "admission_id": 456 }` |
| Response 200 | Shape in §2.2 |
| Errors | Same pattern as `/risk/predict`; additionally `404` if `admission_id` doesn't belong to `patient_id` |

### `POST /api/v1/predictions/feedback`
| | |
|---|---|
| Method | POST |
| Auth | System admin + hospital admin (outcome logging is an operational action) |
| Request | `{ "prediction_id": "uuid", "actual_readmitted": true }` |
| Response 200 | `{ "prediction_id": "uuid", "was_correct": false }` |
| Purpose | FR-READM-04 — feeds future retraining/drift monitoring |

### `GET /api/v1/risk/forecast`
*(Existing stub — keep the route, replace the body.)* Aggregates `risk_predictions` by department/month for the Hospital Administrator dashboard (§7.2). Query params: `department`, `from`, `to`.

### `GET /api/v1/models`, `/models/active`, `/models/metrics`
Replace stub bodies with real `model_metadata` queries. `GET /models/active` returns the row where `status='production'` per model_name. **Remove the MongoDB TODO comment in `ml_models.py:18`** — per the resolved architecture decision (Gap Analysis §5), this must query `model_metadata` in PostgreSQL, not a Mongo collection.

---

## 6. Clinical Insights Engine (Explainable, Rule-Based — No LLM)

Per the brief's explicit instruction, this is deterministic rule logic mapping risk drivers to recommendations — not a generative model. New table:

```sql
CREATE TABLE care_recommendations (
    id SERIAL PRIMARY KEY,
    prediction_id UUID NOT NULL,  -- soft reference to risk_predictions row (see note)
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    recommendation_type VARCHAR(50) NOT NULL
        CHECK (recommendation_type IN ('care', 'follow_up', 'risk_mitigation', 'discharge_checklist')),
    content TEXT NOT NULL,
    priority_rank INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_care_rec_patient ON care_recommendations(patient_id);
```

*(`prediction_id` is a plain UUID column, not a FK, since `risk_predictions.id` is currently a SERIAL integer per the existing migration, not the UUID the original Database Design assumed — recorded here as a naming/type note for whoever writes the migration: use `INTEGER REFERENCES risk_predictions(id)` instead if consistency with the existing PK type is preferred, which is recommended.)*

### 6.1 Rule engine design (`backend/app/services/cds_service.py`, currently empty)

```python
class RecommendationEngine:
    RULES: list[RiskDriverRule] = [...]  # ordered, first-match-wins per category

    def generate(self, risk_result: RiskPredictionResult, patient: Patient) -> list[Recommendation]:
        """Maps contributing_factors + risk_level to ranked recommendations."""
```

**Risk Factors → Follow-up Recommendations (example rule table, illustrative not exhaustive):**

| Risk driver | Follow-up recommendation |
|---|---|
| ≥3 prior admissions in 12 months | Enhanced follow-up: 7-day post-discharge call + 14-day in-person visit |
| High-risk tier + emergency admission type | Priority clinical review before discharge |
| ≥5 discharge medications | Pharmacist medication-reconciliation review |
| Length of stay above department median | Extended discharge-planning checklist |

**Discharge Recommendations:** `DischargeChecklistBuilder` combines `risk_level` + comorbidity count into a checklist template (Low: standard discharge; Medium: enhanced follow-up cadence; High: mandatory clinical review + mitigation plan).

**Preventive Interventions:** mapped from the same driver list — e.g., "3+ prior admissions" → case-management referral; "extended length of stay" → home-health-aide evaluation.

This satisfies ML Design's M3 "explainability-lite" objective directly — recommendations are traceable 1:1 to `contributing_factors` already returned in §1.2's response, so a clinician can see *why* a recommendation fired.

---

## 7. Dashboard Design

### 7.1 Doctor Dashboard

Extends the existing generic `dashboard/page.tsx` shell (Repository Audit §8) with role-conditional sections rather than a full rewrite:

- **Assigned Patients** — already exists (`dashboard/patients`), add risk-level column to the existing patient table.
- **Risk Levels** — new `Badge` per patient row, colored by `risk_category`, sourced from `GET /risk/high-risk` merged with the existing patient list query.
- **Readmission Alerts** — new `Card` on `dashboard/page.tsx` listing the doctor's assigned patients with `predicted_readmission=true`, sourced from a scoped `GET /predictions/readmission?doctor_scope=true` query variant (or client-side filter of `/risk/high-risk` extended to include readmission-type rows).
- **Patient Insights** — on `dashboard/patients/[id]/page.tsx`, add a new "Risk & Recommendations" `Card` showing the latest `GET /risk/{id}` result + `GET /cds/recommendations/{id}` output.

### 7.2 Hospital Administrator Dashboard

New route `dashboard/analytics/page.tsx` (does not exist today):

- **Readmission Trends** — line chart (first real use of the already-installed `recharts` dependency) sourced from `GET /risk/forecast?department=&from=&to=`.
- **Risk Distribution** — bar/pie chart of Low/Medium/High counts hospital-wide, sourced from `GET /risk/high-risk` aggregated client-side or a new `GET /analytics/risk-distribution` endpoint (thin wrapper, trivial to add alongside §5's endpoints).
- **Hospital Analytics** — reuses the existing `HospitalAnalyticsSummary` TypeScript type (currently unused, `types/index.ts:31-37`) — this is the first consumer that makes that type non-dead.
- **Performance Metrics** — `GET /models/metrics` (§5) surfaced as a small `StatTile` row (ROC-AUC, F1, last-trained date) so the administrator can see model health, per SRS's "Access healthcare performance reports" permission row.

Both dashboards reuse the existing shared UI primitives (`Card`, `StatTile`, `Table`, `Badge`) from `components/ui/index.tsx` — no new component library needed for Milestone 2; only `recharts` usage is new, confined to `components/charts/` (currently empty, first real content goes here).

---

*End of HealthForecastAI_Milestone2_Design.md*
