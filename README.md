<<<<<<< HEAD
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

| Milestone | Weeks | Theme |
|-----------|-------|-------|
| 1 | 1-2 | Project initialization, design process and core setup |
| 2 | 3-4 | Risk prediction and readmission forecasting |
| 3 | 5-6 | Treatment effectiveness analysis and healthcare analytics |
| 4 | 7-8 | Testing, deployment and documentation |

Report templates and evaluation criteria: [`docs/06-milestones/`](docs/06-milestones/).

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
=======
# HealthForecast AI - Hospital Readmission Prediction & Patient Risk Intelligence System

HealthForecast AI is an advanced, premium, role-based medical dashboard interface designed for diagnostic prediction tracking, patient cohort analytics, and hospital readmissions telemetry configuration.

---

## 🚀 Key Features

*   **Dual-Tab settings config:**
    *   **User settings:** Change Full Username, customize profile image URL, or upload custom local avatar pictures (converted dynamically to base64 Data URLs).
    *   **Telemetry settings:** Manage PostgreSQL Instance URIs, FastAPI predictions endpoints, and snapshot routine schedules (exhibited strictly to System Admins).
*   **Themed Login Portal:**
    *   Dynamically re-themes border accents, buttons, descriptive subheadings, and assets instantly based on the active role tab selection (Doctor, Hospital Admin, Researcher, System Admin).
*   **Heartbeat Brand Favicon:**
    *   Custom green-and-white squircle brand heartbeat/pulse icon embedded into browser tabs.
*   **Clickable Registries:**
    *   Enables doctors to click directly on patient table records to instantly open patient worksheets and detail paths.
*   **Interactive Visualizations:**
    *   Dynamic bar charts, line graphs, and cohorts analytical tools powered by Recharts.

---

## 🛠️ Technology Stack

1.  **Framework:** React (Vite-powered for hot module reloading)
2.  **Design Styles:** Tailwind CSS v4 + Lucide React icons
3.  **Data Visualization:** Recharts
4.  **Routing:** React Router v7 with protected routes wrapping
5.  **State Management:** Reactive session synchronizer via LocalStorage

---

## 🔑 Access Portals & Testing Credentials

The login portal contains pre-populated quick fill buttons for rapid end-to-end verification traversal. You can log in using:

| Portal Role | E-mail Login Address | Password |
| :--- | :--- | :--- |
| 🩺 **Doctor/Clinician** | `doctor@healthforecast.ai` | `password123` |
| 🏦 **Hospital Admin** | `admin@healthforecast.ai` | `password123` |
| 🧪 **Researcher** | `researcher@healthforecast.ai` | `password123` |
| 💻 **System Admin** | `sysadmin@healthforecast.ai` | `[Hidden Secure Password]` |

---

## 💻 How to Run the Project

### 1. Install Dependencies
Open standard terminal workspace and execute:
```bash
npm install
```

### 2. Start Local Development Server
Boot up Vite's HMR server:
```bash
npm run dev
```
Once started, navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

### 3. Production Build Compilation
Compile optimized production bundles under `/dist` folder:
```bash
npm run build
```

---

## 📁 Directory Structure

```text
src/
├── assets/          # Brand logos and vector files
├── components/      # Common elements, widgets, and layouts
│   ├── common/      # Reusable page elements (badger, headers)
│   └── layout/      # Shared dashboard wrappers
├── context/         # AuthContext and state triggers
├── data/            # Mock database schema models
├── pages/           # Portals modules organized by user roles
│   ├── auth/        # Login and session management page elements
│   ├── doctor/      # Clinician workspaces and worksheets
│   ├── hospital-adm # outcome analytics and billing dashboards
│   ├── researcher/  # population analytics and datasets
│   └── system-admin # database uri config settings and model control panels
├── services/        # Mock REST API simulation layer
└── App.jsx          # Protected routing hierarchy
```
>>>>>>> 0f7bb0b (first-commit)
