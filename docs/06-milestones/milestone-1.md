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

Save the file (**`Ctrl + S`**).

---

### Step 2: Remove `.env` from Git & Install Frontend Dependencies

Run these commands in your PowerShell terminal:

```powershell
# 1. Untrack .env so CI stops failing the structure check
cd 'C:\PROJECTS\Infosys Springboard\HealthForecastAI'
git rm --cached .env

# 2. Install frontend dependencies and verify build
cd frontend
npm install
npm run lint
npm run build
npm run typecheck
cd ..

