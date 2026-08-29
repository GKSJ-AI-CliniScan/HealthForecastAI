# Milestone 1 report - Week 1 & 2 - Project Initialization, Design Process & Core Setup

- **Intern name:** Kiruthika B
- **Branch:** `intern/kiruthika-b`
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

My track was the **frontend**: the login flow, the healthcare dashboard, and the
typed API client that connects them to the backend.

### Pages and components

| File | What it does |
|---|---|
| `frontend/src/app/login/page.tsx` | Sign-in screen posting to `/auth/login` |
| `frontend/src/app/dashboard/page.tsx` | Metrics, patient table, role-aware layout |
| `frontend/src/lib/api.ts` | Typed client for the auth and patient endpoints |
| `frontend/src/lib/auth-context.tsx` | Session state and a `can(permission)` helper |
| `frontend/src/types/index.ts` | Types mirroring the backend schemas |
| `frontend/src/components/ui/MetricCard.tsx` | A single headline number |
| `frontend/src/components/ui/PatientTable.tsx` | Patient list, identified or anonymised |
| `frontend/src/components/ui/RoleBadge.tsx` | Shows which role is signed in |

### Every number on screen comes from the API

There is deliberately **no mock-data fallback**. A dashboard that quietly renders
invented figures when the backend is unreachable looks identical to a working
one, which is exactly how a broken integration survives a demo unnoticed. When
the API cannot be reached the dashboard shows the error and a Refresh button
instead of plausible-looking numbers.

### The UI follows the server's permissions, not its own guesses

After login the app calls `GET /auth/me` and shapes itself from the permission
list the server returns, rather than deciding what to show from the role name in
the token. A researcher holds `patient:read_anonymized` but not
`patient:read_all`, so the dashboard sends them to `/patients/anonymised` and
labels the table "De-identified cohort".

This is presentation only. The server enforces the same rules independently: a
researcher calling `/patients` receives 403 whatever the browser does. The UI
avoids showing a button that would fail, but it is not the thing keeping data
safe.

The dashboard also reads the `scope` field returned with the metrics and labels
them "Your assigned patients" or "Hospital wide", so a doctor is never left
assuming their caseload numbers are hospital-wide figures.

### Session handling

The access token is held in React state, not `localStorage`. A token in
`localStorage` is readable by any script on the page, and for a system holding
patient data that is not a trade worth making for surviving a page refresh.
Milestone 2 should move it to an httpOnly cookie set by the backend.

## How to run it

```bash
git clone <repo-url>
cd HealthForecastAI
git checkout intern/kiruthika-b

# Backend must be running first
cd backend && uvicorn app.main:app --reload --port 8000 &
python ../database/postgres/seeds/seed_users.py

# Frontend
cd ../frontend
npm install
npm run dev
# http://localhost:3000/login
```

Sign in with any demo account. All four use the password printed by the seed
script:

| Email | Role | What the dashboard shows |
|---|---|---|
| `doctor@hospital.example` | Doctor | Assigned patients only |
| `admin@hospital.example` | Hospital Administrator | Hospital-wide metrics |
| `researcher@hospital.example` | Healthcare Researcher | De-identified cohort |
| `sysadmin@hospital.example` | System Administrator | Full access |

```bash
npm run lint
npm run typecheck
npm run build
```

## Evidence

Add screenshots to `docs/05-wireframes/` and link them here. The four worth
capturing are the ones that show the access control working, not just that a
page renders:

1. `login.png` - the sign-in screen
2. `dashboard-doctor.png` - metrics labelled "Your assigned patients"
3. `dashboard-admin.png` - the same layout showing hospital-wide numbers
4. `dashboard-researcher.png` - the table headed "Cohort ID", no record numbers

The third and fourth are the strongest evidence in this report: the same
component, the same code path, different data because the server enforces
different permissions.

```markdown
![Doctor dashboard](../05-wireframes/dashboard-doctor.png)
```

Never screenshot real patient data. The seeded dataset is public and
de-identified, which is why it is safe here.

## Metrics

| Metric | Value |
|---|---|
| Pages implemented | 2 (login, dashboard) |
| Reusable components | 3 |
| API endpoints consumed | 5 |
| Roles with a distinct dashboard view | 4 |
| TypeScript errors | 0 (`npm run typecheck`) |
| ESLint errors | 0 (`npm run lint`) |
| Mock data paths | 0 |

## Known gaps

- **No automated frontend tests.** `npm test` is still the scaffold's
  placeholder. Component tests for the role-based rendering are the first thing
  to add.
- **The session does not survive a page refresh**, which is the deliberate cost
  of keeping the token out of `localStorage`. The httpOnly-cookie change in
  Milestone 2 fixes both at once.
- **No patient detail page.** `GET /patients/{id}` returns the encounter history
  and nothing consumes it yet.
- **No charts.** Recharts is installed; the readmission-rate trend is the
  obvious first chart once Milestone 2 produces predictions.
- **Pagination is not wired up.** The dashboard requests the first 50 patients
  and the API supports `offset`, but there are no page controls.
- **Accessibility has not been audited.** Labels and roles are in place, but
  keyboard navigation and contrast have not been checked properly.
- **No loading skeletons.** A plain "Loading..." line stands in for them.
