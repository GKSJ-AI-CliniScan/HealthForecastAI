# Milestone 4 report - Week 7 & 8 - Testing, Deployment & Documentation

- **Branch:** `main` (reference implementation)
- **Submitted on:** 2026-09-30

---

## Scope for this milestone

- Validate prediction accuracy and healthcare analytics quality.
- Optimize healthcare workflows and dashboard responsiveness.
- Deploy the platform using Docker and a cloud environment.
- Prepare the final project documentation and presentation.
- Demonstrate the complete HealthForecast AI platform.

## Evaluation criteria

- Fully deployed frontend and backend.
- Model testing and validation completed.
- Documentation and presentation prepared.
- Successful end-to-end platform demonstration completed.

**Read this first: the cloud deployment is not done.** The stack is containerised,
runs end to end under Docker Compose, and has a written, gated release workflow, but
no cloud account or credentials were available, so there is **no live URL**. Everything
else in the scope is done. Details under *Known gaps*.

---

## What I built

### Validation (`docs/07-testing/`)

- [`validation-report.md`](../07-testing/validation-report.md): held-out accuracy,
  calibration and lift by band, comparison with the rule already in use, the bugs
  the validation itself found, and the security controls with the test behind each.
- `ml/src/evaluation/validate.py`: reproduces the held-out numbers
  (ROC-AUC 0.633, 95% CI 0.618-0.650; high band 24.7% observed vs 24.6% predicted).
- `backend/tests/test_reconciliation.py`: every report that can be added up, is: the
  summary, age breakdown, performance rows, trend chart, calibration bands, recovery
  report and each dimension of the CSV export agree on one known cohort.
- `tests/e2e/test_platform.py`: 12 checks driving a running deployment through all
  four role journeys, the lockout and the audit trail.
- CI now also builds the schema from migrations on PostgreSQL, runs `alembic check`,
  and runs the backend suite against PostgreSQL as well as SQLite. The first
  PostgreSQL run found a test that was passing on SQLite only through rounding luck.

### Hardening

| Change | Where |
|---|---|
| Lockout after 5 failed sign-ins in 15 minutes, counted from the audit log so it holds across instances; unknown addresses counted too | `auth_service.py`, `auth.py` |
| Production refuses to start with a default secret, `DEBUG`, or wildcard CORS | `core/config.py` |
| `no-store` on API responses, `nosniff`, frame denial, referrer policy; docs off outside `DEBUG`; CORS methods and headers narrowed | `main.py` |
| **Audit trail is now readable**: `GET /audit`, system administrator only, filterable, paginated; reading it is itself recorded | `endpoints/audit.py`, `/audit` page |

The audit log had been written since Milestone 1 but there was no way to read it. That
was found while writing the demonstration script and fixed.

### Performance (`docs/07-testing/performance.md`)

Load test, 20 concurrent users, mixed workload, zero errors in every run:

| Stage | req/s | p50 | p95 | Risk prediction p50 |
|---|---|---|---|---|
| Baseline | 11.9 | 1,032 ms | 8,741 ms | 9,093 ms |
| Batched explanation + 4 workers | 18.4 | 812 ms | 2,860 ms | 726 ms |
| + 60 s report cache | **27.7** | **434 ms** | **2,291 ms** | 597 ms |

Also: a composite index for the "latest prediction per patient" join, and `ANALYZE` after
bulk loads.

### Deployment

- `docker-compose.yml` fixed so a clean checkout actually works: a one-shot `migrate`
  service the API waits for; the model mounted read-only rather than baked in;
  `NEXT_PUBLIC_API_BASE_URL` passed as a **build** argument (it is compiled into the
  frontend, so the old runtime variable did nothing).
- `docker-compose.prod.yml`: nginx as the only published port, databases unpublished,
  secrets required (compose refuses to start without them), production settings enforced.
- `.github/workflows/deploy.yml`: verify, build images, and release over SSH to any
  Docker host when `DEPLOY_HOST` and friends are configured; otherwise it prints what to
  add and exits green.
- [`docs/08-deployment/README.md`](../08-deployment/README.md): runbook, rollback,
  pre-deploy checklist.

### Documentation and presentation

- Final docs: this report, [milestone-3](milestone-3.md), the validation, fairness and
  performance reports, the deployment runbook, updated API, architecture and database
  documents.
- [`docs/09-presentation/`](../09-presentation/): a 15-slide deck (`.pptx`, generated
  by `build_deck.py` from the figures in these reports) and a timed
  [demonstration script](../09-presentation/demo-script.md).

---

## How to run it

```bash
cp .env.example .env
docker compose up -d --build        # postgres, mongodb, migrate, api (4 workers), frontend
# from a Python 3.11 venv (pip install -r ml/requirements.txt), DATABASE_URL -> localhost:5432
(cd ml && python -m src.data.etl && python -m src.models.train && python -m src.models.score)
docker compose exec backend python -m app.db.init_db     # SEED_PASSWORD must be set
curl localhost:8000/health

# checks
(cd backend && pytest)                                   # SQLite; add TEST_DATABASE_URL for PostgreSQL
(cd ml && pytest && python -m src.evaluation.validate)
E2E_BASE_URL=http://localhost:8000 E2E_PASSWORD='<seed password>' pytest tests/e2e -v
python scripts/loadtest.py --password '<seed password>' --concurrency 20 --seconds 30
```

Production: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.

## Evidence

- Full stack built from a clean `docker compose up -d --build` (backend image builds the
  ML wheels, so the first build took ~26 minutes on this machine; later builds ~15 s).
  `migrate` exited 0, `backend` reported healthy, `frontend` served `/login` with 200,
  the model loaded from the mounted volume.
- `tests/e2e`: 12 passed against that stack, on two consecutive runs.
- Backend 283 tests pass on SQLite and on PostgreSQL 16; ML 58 pass; `ruff` and `black`
  clean; `tsc`, `next lint` and `next build` clean; repository CI scripts pass.
- Load test table above.

## Metrics

| Measure | Value |
|---|---|
| Held-out ROC-AUC | 0.633 (95% CI 0.618-0.650) |
| High-risk band | 4.9% of patients, 24.7% readmitted (2.6x baseline), predicted 24.6% |
| Recall / precision at threshold | 0.501 / 0.142 |
| Real-time prediction, no load | 0.13-0.19 s (with explanation) |
| Throughput at 20 concurrent users | 27.7 req/s, 0 errors, p50 434 ms, p95 2.3 s |
| Dashboard query, first / cached | ~0.3 s / ~0.01 s |
| Tests | 283 backend + 58 ML + 12 end-to-end |
| Live deployment URL | **none - see Known gaps** |

## Known gaps

- **No live cloud deployment.** It needs a cloud account and credentials that belong to
  the project owner. What exists is everything short of that: production compose
  overlay, nginx, a runbook, and a release workflow that activates once
  `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS` are set. The
  release path has **not** been exercised against a real host, and TLS is left to the
  load balancer or certbot. Treat the first real deploy as a test.
- **Not a certified medical device and not clinically validated.** The recommendation
  rules are illustrative; ROC-AUC 0.63 is a triage aid, not a diagnosis; the model has
  been validated on one public dataset only.
- **Fairness gaps are reported, not fixed** (recall 0.45 men vs 0.55 women; 0.34 at
  ages 40-50). Closing them is a clinical decision; see the audit.
- **The JWT is stored in `sessionStorage`**, readable by any script on the page. An
  httpOnly cookie is the right design and is not implemented.
- **The login lockout can be used to lock a known address out** for 15 minutes. That is
  the accepted trade-off against unlimited guessing; it is audited.
- **Cache is per process**; workers can disagree by up to 60 s. The cache is not
  warmed after a data load, which is what dominates the p95.
- **MongoDB is running but unused.** The model registry and drift monitoring planned for
  it were not built; the model is a file and its metrics are in `metrics.json`.
- **Terraform / cloud-specific infrastructure code was not written**: without an account
  it could not be validated, and untested infrastructure code is worse than none.
- **The Risk page's calibration table is in-sample** and says so.
- **Trends are by encounter sequence, not calendar month**; the source data has no dates.
- The frontend has no automated browser tests; responsiveness was judged from build size
  and API timings, not measured in a browser.
