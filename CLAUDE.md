# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

HealthForecast AI is an internship project: a hospital readmission prediction
platform (FastAPI + Next.js + an sklearn/XGBoost pipeline). 26 interns each
work on their own `intern/<name>` branch off a shared, deliberately incomplete
scaffold — endpoints return `501`/empty and are marked `TODO(milestone-N)`.
This branch is `intern/kanak-prabhakar`. Full contributor rules are in
`INTERN_GUIDE.md`; only what affects how Claude should operate is repeated here.

## Environment
- Python 3.11, venv at `backend/.venv`, created with `uv` — it has no pip, so use `uv pip install` (not `pip install`).
- Backend settings come from env vars / `.env` via `backend/app/core/config.py` (`Settings`); `.env` is gitignored and must never be committed (CI's `check_structure.py`/`check_secrets.py` block it).

## Style
- ruff + black, line-length 100.

## Commands

**Backend**
```bash
cd backend
ruff check . && black --check .
python -m pytest tests -q   # 70 expected
```
With coverage: `pytest --cov=app --cov-report=term-missing`.

**ML**
```bash
cd ml
ruff check . && black --check .
python -m pytest tests -q   # 27 expected
python -m src.models.train
```

**Frontend**
```bash
cd frontend
npm run lint && npm run build && npm run typecheck
```

**Repo-level checks** (mirror what CI's "Repository checks" job runs — see `scripts/ci/`):
```bash
python scripts/ci/check_structure.py   # required dirs/files present, no committed .env
python scripts/ci/check_syntax.py
python scripts/ci/check_secrets.py
python scripts/ci/check_milestones.py  # docs/06-milestones/*.md must keep all 5 headings
python scripts/ci/check_branch.py "$(git branch --show-current)"
```

Auto-fix: `ruff check . --fix && black .` (backend/ml), `npm run lint:fix` (frontend).

## CI caveat
CI's syntax check parses files without importing or running them, so a broken
import or runtime path (e.g. a config-relative path that only resolves from
the repo root) won't be caught by CI. Always verify by importing and, for the
ML pipeline, actually running it:
```bash
python -c "import src.models.train"    # adjust module path as needed
cd ml && python -m src.models.train    # the real run, not just import
```

## Architecture

**Backend (`backend/app/`)** is layered: `api/v1/endpoints/*.py` (one file per
module from the brief) → `services/*.py` (business logic) → `repositories/`
(DB access) → `models/*.py` (SQLAlchemy ORM). Request/response shapes live in
`schemas/`. Two databases: PostgreSQL via `db/session.py`/SQLAlchemy for
structured records, MongoDB via `db/mongodb.py` for notes and model-run logs.
Audit logs live in PostgreSQL (`models/audit_log.py`), not MongoDB: `actor_id`
must stay a valid reference into the same relational `users` table under
soft-delete (accounts are disabled, never deleted, precisely so audit history
survives) - a referential-integrity guarantee Mongo's document model does not
give for free.

RBAC is central and is enforced server-side, never in the frontend:
- `core/rbac.py` defines the four `Role`s, the `Permission` enum, and the
  `PERMISSIONS` map (the source of truth — mirrors the access matrix in
  `docs/04-rbac/`). Extend it for new features; never weaken an existing role.
- `api/deps.py` builds FastAPI dependencies from it: `require_permission(...)` /
  `require_any_verified_permission(...)` etc. Every endpoint must declare one.
  `get_current_user` trusts the JWT claims alone (cheap, no DB); the
  `verify_account`/`*_verified_*` variants additionally reload the user row so
  a disabled account or role change takes effect before token expiry — use the
  verified variant for anything that returns patient data.
- `backend/tests/test_rbac.py` encodes the access matrix from the brief; if a
  change breaks it, fix the change, not the test.

**ML pipeline (`ml/`)**: `configs/config.yaml` is the single source of truth
for every hyperparameter, split, cleaning rule, and promotion threshold (a
model below the `evaluation.thresholds` bar shouldn't ship) — pipeline code
reads from it rather than hardcoding values. Flow: `src/data/load_data.py` →
`src/data/preprocess.py` (`basic_clean`, driven by `cleaning:` in the config)
→ `src/features/build_features.py` → `src/models/train.py` (fits
logistic regression / random forest / XGBoost per `models:`, writes
`ml/artifacts/readmission_model.joblib` + `metrics.json`) → `src/models/predict.py`.
Datasets and artifacts are never committed (see `ml/data/README.md`); the
backend loads whatever's on disk in `ml/artifacts/`.

`backend/app/services/model_service.py` bridges the two halves: it loads the
joblib artifact once (thread-safe cache, not per-request), derives a version
string from `metrics.json`, and raises `ModelUnavailableError` — surfaced as a
503, never a silently-substituted probability — when no artifact has been
trained yet. `REQUEST_FEATURES` there must stay a superset of what the trained
`ColumnTransformer` expects.

**Frontend (`frontend/src/`)**: Next.js App Router (`app/`), with `components/`
split into `ui/` (generic), `layout/`, `auth/`, `charts/`. Only
`NEXT_PUBLIC_`-prefixed env vars reach the browser — never put a secret there.

## Git
- Never open a PR into `main`; push to `intern/kanak-prabhakar` only (the
  Branch guard workflow fails any PR targeting `main`).
