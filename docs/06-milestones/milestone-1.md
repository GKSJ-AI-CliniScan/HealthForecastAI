# Milestone 1: Project Initialization, Design, and Core Setup

## What I built
- Defined end-to-end healthcare workflows, project objectives, system architecture, and database schemas.
- Configured frontend (Next.js) and backend (FastAPI) development environments.
- Implemented user authentication, password hashing, and role-based access control (RBAC) supporting Doctors, Hospital Administrators, Healthcare Researchers, and System Administrators.
- Implemented user management and patient management endpoints with permission guards and role-specific data scoping.
- Set up the data ingestion and domain-specific preprocessing pipeline for the Diabetes 130-US Hospitals dataset (ICD-9 diagnosis categorization, duplicate removal, and expired patient discharge filtering).

## How to run it
1. Start database containers:
```bash
docker compose up -d
```
2. Run backend test suite:
```bash
cd backend
pytest
```
3. Run code quality checks:
```bash
ruff check backend ml
black --check backend ml
```

## Evidence
- All Pytest unit and RBAC integration tests pass cleanly.
- Code quality checks (`ruff`, `black`) pass with zero errors across backend and ML directories.
- GitHub Actions CI pipeline is completely green on branch `intern/v-naga-phanendra`.

## Metrics
- 35 test cases passing across backend authentication, RBAC, and patient endpoints.
- Preprocessing pipeline successfully buckets ICD-9 diagnostic codes into standard clinical categories and filters out non-readmission target leakage cases.

## Known gaps
- Local end-to-end integration tests require active Docker Desktop engine.
- Advanced ML predictive modeling and readmission forecasting will be built in Milestone 