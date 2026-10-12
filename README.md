# HealthForecast AI

**Hospital Readmission Prediction & Patient Risk Intelligence System**

An AI-powered healthcare analytics platform that predicts hospital readmissions,
identifies high-risk patients, evaluates treatment effectiveness and supports
proactive patient care planning.

> **Status: experimental decision-support prototype.** HealthForecast AI has not been
> clinically validated or approved for patient care. Its scores come from models trained
> on a public research dataset; they are estimates, not diagnoses or calibrated
> probabilities, and must not replace clinical judgment.

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
| Databases | PostgreSQL 16 (all application data). MongoDB 7 is provisioned in Compose but not used by the application |
| ML | scikit-learn (logistic regression, random forest), XGBoost, pandas, NumPy. TensorFlow is listed in `ml/requirements.txt` but no code uses it |
| DevOps | Docker, Docker Compose, GitHub Actions, AWS or Azure |

## Quick start

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
cp .env.example .env
docker compose up --build
```

> The Docker route has **not been verified end to end** and has open risks
> (frontend-to-backend address, no model files or report storage in the
> containers, database initialisation). For a known-good route, run the backend
> and frontend directly with an empty PostgreSQL database and `alembic upgrade
> head`; both routes are in [`docs/08-deployment`](docs/08-deployment/README.md).

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

| Milestone | Weeks | Theme | Report |
|-----------|-------|-------|--------|
| 1 | 1-2 | Project initialization, design process and core setup | [milestone-1](docs/06-milestones/milestone-1.md) |
| 2 | 3-4 | Risk prediction and readmission forecasting | [milestone-2](docs/06-milestones/milestone-2.md) |
| 3 | 5-6 | Treatment effectiveness analysis and healthcare analytics | [milestone-3](docs/06-milestones/milestone-3.md) |
| 4 | 7-8 | Testing, deployment and documentation | [milestone-4](docs/06-milestones/milestone-4.md) (partly complete: not deployed, see the report) |

Reports, evaluation criteria and known gaps: [`docs/06-milestones/`](docs/06-milestones/).

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

Two public research datasets are supported, and neither is ever committed to
this repository (download instructions: [`ml/data/README.md`](ml/data/README.md)):

- **India Hospital Readmission (2015 to 2024)**: the dataset the trained models
  use (the ML configuration's active profile).
- **Diabetes 130-US Hospitals (1999 to 2008)**, 101,766 encounters: the dataset
  named in the project brief, kept as a supported fallback. No model in this
  repository was trained on it.

Which dataset is the official primary one has not been formally decided; see
[`docs/06-milestones/milestone-4.md`](docs/06-milestones/milestone-4.md#known-gaps).

## Licence

See [LICENSE](LICENSE).
