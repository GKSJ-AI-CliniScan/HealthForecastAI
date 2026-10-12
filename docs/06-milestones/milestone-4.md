# Milestone 4 report - Week 7 & 8 - Testing, Deployment & Documentation

- **Intern name:** Niyati R
- **Branch:** `intern/19-niyati-r`
- **Submitted on:** Not recorded. This report was completed on 2026-10-12 at commit `7b99155` plus the documentation set described below; the submission date is for the intern to set when the branch is sent to the mentor.

> **Read this honestly.** This milestone is **only partly complete.** Testing
> and documentation are substantially done. The platform is **not deployed** to
> any cloud, there is **no live URL**, no performance or load measurement, no
> final presentation and no recorded demonstration. This report does not claim
> any of those.

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

### Where each criterion stands

| Criterion | Status | Basis |
|---|---|---|
| Fully deployed frontend and backend | **Not met** | Docker files and Compose exist but a full `docker compose up` has not been verified; no cloud deployment; the deploy workflow's release step is a placeholder |
| Model testing and validation completed | **Partly met** | Unit and API tests pass; test-split metrics exist; one SRS target is missed; no calibration; no clinical validation ([Milestone 2](milestone-2.md)) |
| Documentation prepared | **Met for documentation, not for the presentation** | The eight documentation folders are written (section "What I built") |
| Presentation prepared | **Not met**, no presentation file exists in the repository | |
| Successful end-to-end demonstration | **Not evidenced** | The interface was checked manually and by scripts during development; there is no demonstration record |

| Scope item | Status |
|---|---|
| Validate prediction accuracy and analytics quality | Partly: metrics and tests exist; analytics figures rest on partly synthetic treatment data ([Milestone 3](milestone-3.md)) |
| Optimise workflows and dashboard responsiveness | Interface work done (responsive navigation, themes, states); responsiveness was **not measured** |
| Deploy with Docker and a cloud environment | Docker configuration done and unverified end to end; cloud not done |
| Final documentation and presentation | Documentation done; presentation not done |
| Demonstrate the platform | Not done as a recorded event |

---

## What I built

**Prediction-safety changes** (commits `d9f4b2c`, `ba7f690`). Every place that
shows a model output now states that it is an experimental model score, not a
calibrated probability: a status notice above every dashboard page and the
sign-in form, score captions, relabelled chart series, fixed 0.40 and 0.70 band
cut-offs shown on a band scale, and removal of "% probability" and "Confidence"
wording. The API schemas carry the same descriptions. Tests assert the wording.

**Interface refinement** (commits `ba7f690`, `7b99155`). A consistent design
system with design tokens, shared components and loading, empty, error and
no-access states; a light and a dark theme with a toggle (remembered in the
browser, applied before first paint, following the system setting until chosen);
the **Forecast H** brand mark and favicon; a refined sidebar with outline icons,
Records / Insights / Administration groups, a profile footer and an accessible
mobile menu; and a restyled sign-in page. Routes, permissions and behaviour were
not changed.

**Data and model hardening** (commit `d9f4b2c`). The India relational export
importer with idempotent loading (`admissions.source_admission_id`, migration
`0005`), write-once versioned model runs, sha256 integrity checks at
registration and at load time, and the leak-safe training rules described in
[Milestone 2](milestone-2.md).

**Docker and CI.** Two Dockerfiles (backend `python:3.11-slim` with a non-root
user and a health check; frontend `node:22-alpine`, standalone build, non-root
user), `docker-compose.yml` (PostgreSQL, MongoDB, backend, frontend), and
GitHub Actions workflows for repository checks, backend, frontend and ML
checks, Docker builds, security scans and a manual deploy. A nginx
configuration template exists but is not wired into Compose.

**Documentation (completed 2026-10-12).**

| Folder | Content |
|---|---|
| [`docs/01-architecture`](../01-architecture/README.md) | Component, request, authentication, ML and deployment diagrams |
| [`docs/02-database`](../02-database/README.md) | ER diagram, constraints, migrations, dataset mapping, SQL-versus-Alembic conflict |
| [`docs/03-api`](../03-api/README.md) | All 53 operations, safety semantics; `openapi.json` regenerated |
| [`docs/04-rbac`](../04-rbac/README.md) | Required versus implemented permissions, scoping, open decisions |
| [`docs/05-wireframes`](../05-wireframes/README.md) | 13 retrospective current-state SVG wireframes |
| [`docs/06-milestones`](README.md) | Milestone reports 1 to 4 |
| [`docs/07-testing`](../07-testing/README.md) | Test plan and evidence |
| [`docs/08-deployment`](../08-deployment/README.md) | Runbook and open container risks |

Supporting READMEs (root, frontend, database, deployment, ML data) were corrected,
and the original design documents in `docs/niyati/` were kept with status notes.

## How to run it

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
git checkout intern/19-niyati-r
cp .env.example .env            # then set real values; see docs/08-deployment

# Local (recommended): empty PostgreSQL 16 database, then
cd backend && pip install -r requirements-dev.txt && alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000/docs
cd frontend && npm install && npm run dev   # http://localhost:3000

# Checks
cd backend && pytest -q
cd ml && pytest -q
cd frontend && npm test && npm run typecheck && npm run lint
```

The container route (`docker compose up --build`) and its open risks are in
[`docs/08-deployment`](../08-deployment/README.md); it has **not** been verified
end to end. Model files are not in the repository and must be trained and
registered ([Milestone 2](milestone-2.md)).

## Evidence

| Evidence | Result | Status |
|---|---|---|
| Backend tests at commit `7b99155` | 579 passed, 33 skipped (live end-to-end suite), 0 failed | Executed 2026-10-12 |
| ML tests | 148 passed | Executed 2026-10-12 |
| Frontend tests | 222 passed in 28 files | Executed 2026-10-12 |
| TypeScript and ESLint | Exit 0 | Executed 2026-10-12 |
| Frontend production build | Passed with network access; failed with no network and no build cache (the font is downloaded at build time); passed offline with a warm cache | Executed 2026-10-12, in a scratch copy |
| Repository check scripts (structure, syntax, files, secrets, notebooks, docs, milestones, branch) | All pass except `check_structure`, which flags only a local untracked `.env` (see "Documentation validation" below) | Executed 2026-10-12 |
| Interface verification in a browser | Scripted runs for the sign-in page (all three widths, both themes) and for the doctor and system-administrator roles; hospital administrator and researcher not browser-checked; the owner reports a manual review of the final interface | Historical and reported; no artifacts in the repository |
| Docker image builds | Configured in CI; no result recorded here | Unverified |
| `docker compose up` through sign-in and a prediction | Not run | Missing |
| Cloud deployment, health check through a load balancer | Not done | Missing |

### Documentation validation

Run on 2026-10-12 after the documentation was written:

| Check | Result |
|---|---|
| `scripts/ci/check_docs.py` (relative links) | Passed: 0 problems |
| `scripts/ci/check_milestones.py` | Passed: all four reports carry the five required headings and none carries the `_Not started_` marker |
| `check_syntax.py`, `check_files.py`, `check_secrets.py`, `check_notebooks.py`, `check_branch.py` | Passed |
| `check_structure.py` | Reports one problem: a local, untracked `.env` file exists in the working copy. It is ignored by Git and not part of the repository, so a clean checkout would not contain it. |
| `docs/03-api/openapi.json` | Valid JSON, 53 operations, 45 schemas, equal to the application's own generated schema |
| SVG wireframes | 13 files, all well-formed XML, each under 20 KB; each was rendered in Chrome and inspected, and the defects found (overlapping labels, a clipped title, low-contrast tick labels, a login detail that did not match the committed page) were fixed |
| Mermaid diagrams | 6 diagrams (5 in the architecture document, 1 in the database document), rendered with Mermaid 10.9.1 in headless Chrome during the final review: all render without errors and were inspected by eye. The Mermaid library was loaded from a CDN for that check; it is not a project dependency. |

## Metrics

| Requested metric | Value |
|---|---|
| Prediction response time | **Not measured** (SRS target: 2 s at the 95th percentile) |
| Dashboard loading speed | **Not measured** (SRS target: 3 s at the 95th percentile) |
| Concurrent request handling | **Not measured**; no load test exists |
| Final model metrics | Readmission: accuracy 0.687, precision 0.237, recall 0.669, F1 0.350, ROC-AUC 0.741. Risk: accuracy 0.637, precision 0.269, recall 0.592, F1 0.370, ROC-AUC 0.656. Test split, experimental, uncalibrated; see [Milestone 2](milestone-2.md). |
| Test count | Backend 579 passed + 33 skipped; ML 148; frontend 222; total 949 passed, 33 skipped |
| Test coverage | **No current figure.** The Milestone 1 report's 95% for the backend is from 2026-08-31 and was not re-measured; the frontend has no coverage tooling. |
| Live deployment URL | **None** |

## Known gaps

1. **Not deployed.** No cloud environment, URL, TLS, secret store, monitoring or
   load balancer. The deploy workflow's release step only prints a notice.
2. **Container path unverified, with five risks found by reading the files:**
   the frontend container's backend address (`localhost` inside the container),
   no model files in the backend container, no persistence for report files, an
   unused MongoDB service that the backend waits for, and a database that the
   Compose init script and Alembic cannot both initialise. Details and
   mitigations in [`docs/08-deployment`](../08-deployment/README.md#7-known-risks-in-the-container-path).
3. **No performance, load or concurrency testing.** The SRS latency targets are
   unverified.
4. **No final presentation and no recorded demonstration.**
5. **Unmet and unmeasured SRS targets:** readmission ROC-AUC 0.741 against 0.75;
   high-risk F1 not measured ([Milestone 2](milestone-2.md)).
6. **Experimental models, no clinical validation, no calibration.** The product is
   a decision-support prototype and says so everywhere a score is shown.
7. **Missing features from the brief and SRS:** audit-log viewer, doctor-generated
   outcome reports, refresh tokens, password reset, account lockout, outcome
   feedback and drift monitoring, model training or promotion through the
   interface, Synthea data, encryption at rest.
8. **Partly synthetic analytics data.** Treatment outcomes and departments are
   not produced by the dataset importers ([Milestone 3](milestone-3.md)).
9. **Testing limits.** No current coverage figure, tests do not run against
   PostgreSQL or through Docker, the end-to-end suite has no recorded run, and no
   screen-reader testing was done ([`docs/07-testing`](../07-testing/README.md)).
10. **Decisions awaiting the mentor** (none is recorded as made):
    1. MongoDB: keep it in the architecture, or remove it. It is provisioned and
       unused; the brief lists it, the project's Database Design excludes it.
    2. Dataset: accept the India Hospital Readmission export as primary
       (implemented) or require Diabetes 130-US (named in the brief).
    3. Role matrix: what "Limited" means for doctors' hospital analytics, whether
       doctors' treatment figures should be hospital-wide, and whether hospital
       administrators may score patients and list high-risk patients
       ([`docs/04-rbac`](../04-rbac/README.md#6-known-gaps-and-open-decisions)).
    4. SRS success targets: keep, waive or restate.
    5. Whether to descope Synthea formally.
11. **What would complete the milestone:** a recorded `docker compose up`
    and prediction, resolution of the five container risks, a cloud deployment
    with a URL and a screenshot of a passing health check, a measured latency and
    load figure, a coverage run, a presentation, and a recorded demonstration.
