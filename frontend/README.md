<<<<<<< HEAD
# HealthForecast AI - Frontend (Next.js + Tailwind)

Dashboards for doctors, hospital administrators, healthcare researchers and
system administrators.

## Layout

| Path                     | Responsibility |
|--------------------------|----------------|
| `src/app/`               | App Router pages and layouts |
| `src/components/ui/`     | Reusable primitives (buttons, cards, tables) |
| `src/components/charts/` | Recharts wrappers for analytics |
| `src/components/layout/` | Shell, navigation, role-aware menus |
| `src/lib/api.ts`         | Typed fetch wrapper for the FastAPI backend |
| `src/hooks/`             | Client-side data hooks |
| `src/types/`             | Shared TypeScript types mirroring the backend schemas |

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. The backend must be running on port 8000, or set
`NEXT_PUBLIC_API_BASE_URL` in `.env.local`.

## Checks that CI runs

```bash
npm run lint
npm run build
npm run typecheck
```

## Rules

- Only variables prefixed `NEXT_PUBLIC_` reach the browser. Never put a secret,
  a database URL or a JWT signing key behind that prefix.
- Never render a patient identifier in a researcher-facing view.
- Keep `src/types/index.ts` in sync with `backend/app/schemas/`.
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
>>>>>>> d6aaceb (6th commit)
