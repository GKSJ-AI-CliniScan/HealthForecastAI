# HealthForecast AI - Frontend (React + Vite + TypeScript + Tailwind CSS)

Clinical Risk Intelligence and Operational Platform dashboards for Doctors, Hospital Administrators, Healthcare Researchers, and System Administrators.

## Technology Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript (Strict mode)
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS + Glassmorphism Design System
- **State & Data**: TanStack React Query + Axios (Bearer token injection & 401 refresh queue)
- **Validation**: React Hook Form + Zod
- **Icons**: Lucide React

## Project Structure

| Path | Responsibility |
|---|---|
| `src/routes/` | AppRoutes, ProtectedRoute & RoleBasedRoute configurations |
| `src/pages/landing/` | Healthcare Landing Page (`/`) |
| `src/pages/auth/` | Login, Registration (`/register`), and Password Recovery |
| `src/pages/dashboard/` | Role-specific Dashboard views |
| `src/pages/patients/` | Patient Management Directory & Clinical Detail Tabs |
| `src/pages/clinical/` | Medical History, Admissions & Treatments |
| `src/pages/admin/` | User Management, Roles, Doctor-Patient Assignments, Audit Logs & Dataset Pipeline |
| `src/components/ui/` | Reusable UI primitives (Buttons, Modals, CustomDropdown, Inputs, Tables, Badges) |
| `src/components/layout/` | AppLayout, Header, Sidebar navigation, ThemeToggle |
| `src/context/` | AuthContext & ThemeContext |
| `src/api/` | Typed API clients for FastAPI backend |
| `src/types/` | Shared TypeScript interfaces mirroring backend schemas |

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. The backend must be running on port 8000 (or configure `VITE_API_BASE_URL`).

## CI Quality Checks

```bash
npm run lint
npm run build
npm run typecheck
```

## Security & Privacy Rules

- Only variables prefixed with `VITE_` reach the browser. Never expose private credentials.
- Never render identifying PII in researcher-facing views (Researcher portal is strictly de-identified).
- Keep `src/types/` synchronized with `backend/app/schemas/`.
