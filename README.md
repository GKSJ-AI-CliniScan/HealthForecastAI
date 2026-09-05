# HealthForecast AI

**Hospital Readmission Prediction & Patient Risk Intelligence System**

An AI-powered healthcare analytics platform that predicts hospital readmissions,
identifies high-risk patients, evaluates treatment effectiveness and supports
proactive patient care planning.

> **Interns start here: [INTERN_GUIDE.md](INTERN_GUIDE.md).**
> You work on your own branch. Nothing is merged into `main`.

---

## What it does

The platform helps hospitals reduce unnecessary readmissions, improve patient
outcomes and optimise healthcare resources through patient risk prediction,
readmission forecasting, treatment effectiveness analysis and hospital
performance reporting.

Intended users: hospitals, healthcare providers, clinics, insurance companies,
healthcare researchers and public health organisations.

## Modules

| # | Module | Capability |
|---|--------|-----------|
| 1 | User Management | Doctor and administrator accounts, authentication, role management |
| 2 | Patient Data Management | Patient records, medical history, treatment and admission tracking |
| 3 | Risk Prediction | Risk analysis, readmission probability, high-risk identification |
| 4 | Treatment Effectiveness | Outcome evaluation, recovery and medication effectiveness analysis |
| 5 | Clinical Decision Support | Care recommendations, follow-up planning, discharge support |
| 6 | Healthcare Analytics Dashboard | Readmission analytics, hospital performance, trend visualisation |
| 7 | AI Model Management | Model training, evaluation, prediction monitoring, optimisation |

## Roles

Four roles, each with a distinct view of the data. The full access matrix is in
[`docs/04-rbac/`](docs/04-rbac/) and is enforced in code by
[`backend/app/core/rbac.py`](backend/app/core/rbac.py).

| Role | Sees |
|------|------|
| **Doctor** | Assigned patients, their risk predictions and care recommendations |
| **Hospital Administrator** | Hospital-wide analytics and performance, read-only on records |
| **Healthcare Researcher** | Anonymised cohorts and aggregated statistics only |
| **System Administrator** | Everything, plus user and model management |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic, JWT |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts |
| Databases | PostgreSQL 16, MongoDB 7 |
| ML | scikit-learn, XGBoost, Random Forest, TensorFlow, pandas, NumPy |
| DevOps | Docker, Docker Compose, GitHub Actions, AWS or Azure |

## Quick start

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | <http://localhost:3000> |
| Backend | <http://localhost:8000> |
| API docs | <http://localhost:8000/docs> |

Running each service directly, without Docker, is covered in
[INTERN_GUIDE.md](INTERN_GUIDE.md#2-get-set-up).

## Repository layout

| Path | Contents |
|------|----------|
| [`backend/`](backend/) | FastAPI service - API, RBAC, ORM, migrations, tests |
| [`frontend/`](frontend/) | Next.js dashboards |
| [`ml/`](ml/) | Modelling pipeline - preprocessing, training, evaluation |
| [`database/`](database/) | PostgreSQL schema, MongoDB collection definitions |
| [`deployment/`](deployment/) | Docker, nginx, AWS and Azure notes |
| [`docs/`](docs/) | Architecture, database, API, RBAC, wireframes, milestones, testing, deployment |
| [`scripts/ci/`](scripts/ci/) | The check scripts CI runs |
| [`tests/`](tests/) | Integration and end-to-end tests |
| [`.github/workflows/`](.github/workflows/) | CI, branch guard, security, progress report, deploy |

## Milestones

| Milestone | Weeks | Theme | Status on `main` |
|-----------|-------|-------|------------------|
| 1 | 1-2 | Project initialization, design process and core setup | **Complete** |
| 2 | 3-4 | Risk prediction and readmission forecasting | Not started |
| 3 | 5-6 | Treatment effectiveness analysis and healthcare analytics | Not started |
| 4 | 7-8 | Testing, deployment and documentation | Not started |

Report templates and evaluation criteria: [`docs/06-milestones/`](docs/06-milestones/).

### What works today

`main` carries a working Milestone 1 reference implementation:

- JWT authentication with bcrypt hashing, audited logins, and immediate session
  revocation when an account is deactivated
- The full access matrix enforced in code and pinned by tests, with scoping
  applied inside the SQL query rather than after it
- Patient management with search, pagination and admission history
- Role-aware dashboards for all four roles, built with real aggregates
- The Diabetes 130-US Hospitals dataset loaded: 101,766 raw encounters cleaned
  to 69,990, an 8.98% 30-day readmission rate

Risk prediction, treatment effectiveness and clinical decision support endpoints
are routed and authorised but return placeholder data, tagged
`TODO(milestone-2)` and `TODO(milestone-3)`.

Full write-up: [`docs/06-milestones/milestone-1.md`](docs/06-milestones/milestone-1.md).

## Continuous integration

CI runs on **every branch**, and skips the jobs whose folders do not exist yet,
so an early branch is not failed for work that has not started.

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| [CI](.github/workflows/ci.yml) | Every push and pull request | Repository checks, backend, frontend, ML, Docker |
| [Branch guard](.github/workflows/branch-guard.yml) | Pull requests | Blocks pull requests into `main` |
| [Security](.github/workflows/security.yml) | Every push, weekly | `pip-audit`, `npm audit`, CodeQL |
| [Intern progress report](.github/workflows/intern-progress.yml) | Weekly, on demand | One table of every intern branch and its CI status |
| [Deploy](.github/workflows/deploy.yml) | Manual only | Milestone 4: verify, build images, release to your environment |

The full list of checks and how to run them locally is in
[INTERN_GUIDE.md](INTERN_GUIDE.md#6-what-ci-checks).

## Contributing

This is an internship project repository.

- Work on `intern/<your-name>`.
- Do not push to `main`.
- Do not open pull requests into `main`.
- Never commit datasets, model artifacts, `.env` files, credentials, or any
  real patient data.

Read [INTERN_GUIDE.md](INTERN_GUIDE.md) before your first commit.

## Dataset

Diabetes 130-US Hospitals (1999-2008), 101,766 encounters.
Download instructions: [`ml/data/README.md`](ml/data/README.md).
**The dataset is never committed to this repository.**

## Licence

See [LICENSE](LICENSE).
