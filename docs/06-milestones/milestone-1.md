# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

- **Intern name:** Kiruthika B
- **Branch:** `intern/20-kiruthika-b`
- **Submitted on:** 29 August 2026

---

## Scope for this milestone

- Define healthcare workflows and project objectives.
- Design the system architecture and database schema.
- Create UI wireframes and plan the workflows.
- Set up the frontend and backend environments.
- Implement authentication, role-based access control, user permissions and
  dashboard access for Doctors, Hospital Administrators, Healthcare Researchers
  and System Administrators.
- Load the Diabetes 130-US Hospitals dataset.
- Build patient management and healthcare dashboard workflows.

## Evaluation criteria

- Project initialization and architecture setup completed.
- Authentication, role-based access control and patient management workflows implemented.
- Healthcare dashboard functional.
- Dataset integration and preprocessing completed.

---

## What I built

My track was the **frontend**: the authentication flow, the healthcare clinical dashboard, patient management directory, patient dossier view, and the typed service architecture.

### Pages and components

| File | What it does |
|---|---|
| `frontend/src/app/login/page.tsx` | Sign-in screen supporting all 4 clinical demo accounts |
| `frontend/src/app/dashboard/page.tsx` | Role-aware metrics overview, high-risk patient list, and route guard |
| `frontend/src/app/patients/page.tsx` | Patient directory with multi-filter controls (search, risk, status, doctor caseload) |
| `frontend/src/app/patients/[id]/page.tsx` | Patient details dossier with clinical header, 4 tab panels, and back navigation |
| `frontend/src/lib/auth-context.tsx` | Session state provider, role switcher, and route protection |
| `frontend/src/services/patientService.ts` | Data service providing filtering, search, pagination, and clinical statistics |
| `frontend/src/components/dashboard/StatsOverview.tsx` | Role-adapted headline metrics overview |
| `frontend/src/components/patients/PatientListTable.tsx` | Patient list table with risk badges, status, and pagination |
| `frontend/src/components/patients/PatientBasicInfo.tsx` | Patient demographics, contact details, and emergency contacts |
| `frontend/src/components/ui/RoleBadge.tsx` | Shows which clinical role is currently signed in |

### Client-side architecture & service layer

The frontend utilizes a modular service layer (`patientService`, `authService`, `mockData`) that manages clinical state, multi-criteria filtering, and role scoping. This ensures full standalone reliability for frontend demonstrations while adhering to typed interfaces ready to connect directly to the backend API. When errors occur or data is unavailable, the UI gracefully renders `ErrorMessage.tsx` with a retry option.

### Role-based presentation & scoping

The UI adapts dynamically to the active user's role:
- **Doctor:** Scoped to assigned patients, displays length of stay and high-risk patient alerts.
- **Hospital Administrator:** Displays hospital-wide bed occupancy (86.4%) and total admissions.
- **Healthcare Researcher:** Anonymizes patient records into de-identified cohort IDs (`COHORT-xxxx`) and hides personal names.
- **System Administrator:** Displays system governance overview and full hospital records.

### Session handling & Route Protection

Session state is managed via `AuthProvider` and persisted in `sessionStorage` for demo convenience. Direct unauthenticated access to `/dashboard`, `/patients`, or `/patients/[id]` triggers immediate redirection to `/login`. Logging out clears session storage, resets user state, and redirects to `/login`.

## How to run it

```bash
git clone <repo-url>
cd HealthForecastAI
git checkout intern/20-kiruthika-b

# Frontend development server
cd frontend
npm install
npm run dev
# http://localhost:3000/login
```

Sign in with any demo account or use the role switcher:

| Email | Role | What the dashboard shows |
|---|---|---|
| `doctor@hospital.example` | Doctor | Assigned patients only |
| `admin@hospital.example` | Hospital Administrator | Hospital-wide metrics (Bed occupancy) |
| `researcher@hospital.example` | Healthcare Researcher | De-identified cohort |
| `sysadmin@hospital.example` | System Administrator | Full access |

```bash
npm run lint
npm run typecheck
npm run build
```

## Evidence

### 1. Code Quality & Build Checks

Actual command outputs on branch `intern/20-kiruthika-b`:

- **TypeScript Static Analysis (`npm run typecheck`):**
  ```bash
  $ npm run typecheck
  > tsc --noEmit
  # Exit Code: 0 (0 errors)
  ```

- **ESLint Code Quality Inspection (`npm run lint`):**
  ```bash
  $ npm run lint
  > eslint .
  # Exit Code: 0 (0 errors, 0 warnings)
  ```

### 2. Development Server Endpoint Compilation

During development server execution, the following 6 application routes compiled cleanly and returned HTTP `200 OK` status codes upon request (confirming page compilation and rendering without runtime errors):

| Route | Description | HTTP Response |
|---|---|:---:|
| `/login` | Practitioner login page | `200 OK` |
| `/register` | User registration page | `200 OK` |
| `/dashboard` | Clinical dashboard page | `200 OK` |
| `/patients` | Patient directory page | `200 OK` |
| `/patients/1` | Patient details dynamic route (`/patients/[id]`) | `200 OK` |
| `/` | Landing / Platform overview page | `200 OK` |

### 3. Patient Status Filtering Implementation Verification

The patient filtering implementation in [`src/services/patientService.ts`](../../frontend/src/services/patientService.ts) was inspected and verified against the patient data model:

- **Inpatient Filter (`status === 'inpatient'`):**
  - Evaluates `p.admission_status === 'admitted'` or `discharge_date === null` on active hospital encounters.
  - Correctly matches currently admitted patient records (Arthur Pendleton, Maria Santos-Cruz, James Washington, Robert Henderson).
- **Discharged Filter (`status === 'discharged'`):**
  - Evaluates `p.admission_status === 'discharged'` or `discharge_date !== null`.
  - Correctly matches discharged patient records (Dorothy Gable, Evelyn Chen).

### 4. Wireframes Documentation

The UI wireframes and initial design specifications are documented in [`docs/05-wireframes/milestone-1-wireframes.md`](../05-wireframes/milestone-1-wireframes.md).

Never screenshot real patient data. The seeded dataset is public and de-identified.

## Metrics

| Metric | Value |
|---|---|
| Application routes | 6 (`/login`, `/register`, `/dashboard`, `/patients`, `/patients/[id]`, `/`) |
| Reusable component files | 30 |
| TypeScript errors | 0 (`npm run typecheck` — Exit Code 0) |
| ESLint errors | 0 (`npm run lint` — Exit Code 0) |
| Development routes compiled | 6 (HTTP 200 OK) |

## Known gaps

- **Automated tests for frontend components:** Component tests for the role-based rendering and tab transitions to be added with Jest/React Testing Library.
- **HttpOnly cookie authentication:** Milestone 2 will migrate session storage to secure httpOnly cookies set directly by the backend FastAPI server.
- **Live Prediction Charts:** Recharts visualization for historical readmission trends to be integrated once ML inference endpoints are live in Milestone 2.
- **Formal accessibility audit:** WCAG 2.1 AA keyboard and screen reader audit to be completed.
