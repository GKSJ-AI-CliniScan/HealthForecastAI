# HealthForecast AI — Project Documentation

**Project:** St. Jude Medical Center — Patient Readmission & Clinical Risk Intelligence System  
**Stack:** MongoDB, Express.js (MVC), React 19, Node.js, Tailwind CSS v4  
**Author / Team:** Infosys Project Team  
**Version:** 2.0 (Milestones 1 & 2 Complete)  

---

## 1. Project Overview

HealthForecast AI is a hospital web application built for **St. Jude Medical Center**. The system helps doctors, hospital administrators, healthcare researchers, and system admins track and reduce 30-day patient readmissions.

### Why this project was built:
- **For Doctors:** To see which patients are at high risk of returning to the hospital within 30 days, record clinical notes, prescribe medications, update recovery vitals, and plan safe discharges.
- **For Hospital Admins:** To track bed occupancy, monitor department recovery rates against targets, and download audit-ready CSV reports.
- **For Researchers:** To analyze de-identified patient population health trends and disease correlations without exposing private patient data (HIPAA compliant).
- **For System Admins:** To manage staff accounts, set permissions (RBAC), and review security audit logs.

---

## 2. Tech Stack & Tools

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite | Fast single-page application with modern hooks and fast HMR |
| **Styling** | Tailwind CSS v4 | Clean White & Red clinical theme with custom 3D card tilt motion |
| **Charts** | Recharts | Interactive bar, pie, and line charts for clinical metrics |
| **Icons** | Lucide React | Clean, lightweight icon set |
| **Backend** | Node.js + Express.js | RESTful API built using the Model-View-Controller (MVC) pattern |
| **Database** | MongoDB + Mongoose | Document database for users, patients, logs, and datasets |
| **Auth** | JWT + bcryptjs | Secure login with role-based access control (RBAC) |
| **Data Resilience** | LocalStorage Fallback | Offline/demo fallback so the UI never breaks if the backend restarts |

---

## 3. System Architecture

The application uses a standard 3-tier architecture:

```
[ Frontend (React 19 + Tailwind v4) ]
                 │
                 │ HTTP / REST with JWT Bearer Token
                 ▼
[ Backend (Node.js + Express MVC) ]
  ├── Middleware (JWT verification, RBAC role guard, Error handler)
  ├── Controllers (auth, patient, analytics, admin)
  └── Models (User, Patient, Encounter, AuditLog, Dataset)
                 │
                 │ Mongoose ODM
                 ▼
[ Database (MongoDB @ localhost:27017) ]
```

---

## 4. UI & Visual Design

We designed the application with a **clean medical aesthetic**:
- **Colors:** White background (`#ffffff` / `bg-zinc-50`) with crimson red accents (`#dc2626`) and soft pastel status badges (`bg-red-50`, `bg-amber-50`, `bg-emerald-50`).
- **3D Depth & Motion:**
  - **TiltCards:** Department and facility cards tilt slightly in 3D following the user's mouse cursor.
  - **Perspective Grid:** A subtle 3D floor grid in the hero section gives depth without cluttering the screen.
  - **Floating Stat Pills:** Floating key statistics in the hero section that gently animate.

---

## 5. Portal Features & User Roles

The app provides 4 separate workspaces based on the user's role:

### 5.1 Public Homepage (`/`) & Login (`/login`)
- **Public Homepage:** Anyone can visit without logging in. Shows hospital details for St. Jude Medical Center, clinical departments (Cardiology, Endocrinology, Pulmonary, Nephrology, Emergency, Surgery), 24/7 hotline numbers, and a direct button to the staff login.
- **Login Page:** Clean login card with tabs to quickly switch between demo accounts for Doctor, Admin, Researcher, and SysAdmin.

### 5.2 Doctor Portal (`/doctor/*`)
- **Dashboard (`/doctor/dashboard`):** Overview of assigned patients, risk distribution chart, and quick alerts for high-risk patients.
- **Patient Registry (`/doctor/patients`):** Search patients by name/ID, filter by risk level or doctor, sort by risk/age, and **register new patients** via modal.
- **Patient Details (`/doctor/patients/:id`):** Full patient profile where doctors can:
  - **Add Clinical Notes:** Categorized notes (Progress Note, Consultation, Triage).
  - **Add Medications / Treatments:** Add prescriptions and treatment history.
  - **Update Vitals:** Edit blood pressure readings, recovery score (0–100%), and medication adherence.
  - **Discharge Patients:** Update care status to *Stable*, *Improving*, *Critical*, or *Discharged*.
- **Risk Stratification (`/doctor/risk-predictions`):** Breakdown of patient risk levels by diagnosis.
- **Clinical Insights (`/doctor/clinical-insights`):** Checklist for validating AI-suggested risk reduction pathways.

### 5.3 Hospital Admin Portal (`/hospital-admin/*`)
- **Operations Dashboard (`/hospital-admin/dashboard`):** Track total patients (1,420), bed occupancy (81.3%), readmission rate (14.2% vs 12% target), and risk distribution donut chart.
- **Department Performance (`/hospital-admin/performance`):** Compare recovery rates and metrics across all 6 hospital wards.
- **Reports & Export (`/hospital-admin/reports`):** Configure filters and download live **CSV spreadsheets** directly to your computer.

### 5.4 Researcher Portal (`/researcher/*`)
- **Population Health (`/researcher/population-health`):** Anonymized demographic data, age groups, and length of stay by diagnosis.
- **Readmission Trends (`/researcher/readmission-trends`):** Historical monthly readmission rates over time.
- **Research Datasets (`/researcher/datasets`):** View and download sanitized CSV datasets.

### 5.5 System Admin Console (`/system-admin/*`)
- **User Management (`/system-admin/users`):** Add staff accounts, change roles, activate/suspend users, and delete accounts.
- **Role Management (`/system-admin/roles`):** View permissions matrix across all 4 roles.
- **AI Models (`/system-admin/models`):** Inspect model accuracy and simulate retraining.
- **Audit Logs (`/system-admin/audit-logs`):** Searchable security log of every action taken in the system.
- **System Settings (`/system-admin/settings`):** Manage session timeouts and export system backups.

---

## 6. Database Models (Mongoose)

### 1. `User` (`backend/models/User.js`)
Stores staff login credentials, roles, and profiles.
- Fields: `name`, `email`, `password` (bcrypt hashed), `role` (`doctor`, `hospital-admin`, `researcher`, `system-admin`), `department`, `isActive`, `avatar`.

### 2. `Patient` (`backend/models/Patient.js`)
Stores patient records, clinical history, notes, and vitals.
- Fields: `id` (e.g. `HFC-001`), `name`, `age`, `gender`, `diagnosis`, `riskLevel` (`High`, `Medium`, `Low`), `readmissionProbability` (0–100), `treatmentStatus` (`Stable`, `Improving`, `Critical`, `Under Observation`, `Discharged`), `assignedDoctor`, `admissionDate`, `dischargeDate`, `contact`, `clinicalNotes`, `treatmentHistory`, `recoveryProgress` (score, BP, medication adherence).

### 3. `AuditLog` (`backend/models/AuditLog.js`)
Tracks security and clinical actions for compliance.
- Fields: `user`, `action`, `category`, `status`, `ipAddress`, `timestamp`.

### 4. `Dataset` (`backend/models/Dataset.js`)
Stores research dataset metadata and record counts.

---

## 7. REST API Endpoints

All protected endpoints require a valid JWT token sent in the `Authorization: Bearer <token>` header.

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/login` — Log in with email and password, returns JWT token and user info.
- `GET /api/v1/auth/me` — Get the currently logged-in user's profile.

### Patients (`/api/v1/patients`)
- `GET /api/v1/patients` — List patients with optional query filters (`?search=`, `?riskLevel=`, `?doctor=`).
- `POST /api/v1/patients` — Create a new patient record (auto-generates unique ID and sets admission date).
- `GET /api/v1/patients/:id` — Get full details of a specific patient.
- `PUT /api/v1/patients/:id` — Update patient details, vitals, or status.
- `POST /api/v1/patients/:id/notes` — Add a clinical progress note to a patient.
- `POST /api/v1/patients/:id/treatments` — Add a medication or treatment to a patient's history.
- `DELETE /api/v1/patients/:id` — Delete a patient record (Admin only).

### Analytics & Reports (`/api/v1/analytics`)
- `GET /api/v1/analytics/hospital-dashboard` — Returns hospital-wide KPIs, risk donut data, and department performance.
- `GET /api/v1/analytics/research-data` — Returns HIPAA-de-identified cohort analytics.

### Administration (`/api/v1/admin`)
- `GET /api/v1/admin/dashboard` — Returns system metrics, active model stats, and recent audit logs.
- `GET /api/v1/admin/users` — List all staff users.
- `POST /api/v1/admin/users` — Create a new staff user.
- `PUT /api/v1/admin/users/:id/role` — Update a user's role.
- `PUT /api/v1/admin/users/:id/toggle-status` — Activate or suspend a user account.
- `DELETE /api/v1/admin/users/:id` — Delete a staff user.
- `GET /api/v1/admin/audit-logs` — Fetch security audit logs.

---

## 8. How to Run the Project Locally

### Prerequisites
- Node.js (v18 or newer)
- MongoDB running locally at `mongodb://127.0.0.1:27017` (or provide a MongoDB Atlas URI in `backend/.env`)

### Step 1: Start the Backend
```bash
cd backend
npm install
npm run seed     # Seeds default accounts and realistic patient records
npm run dev      # Starts API server on http://localhost:8000
```

### Step 2: Start the Frontend
```bash
cd frontend
npm install
npm run dev      # Starts Vite server on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## 9. Demo Login Credentials

You can log in with any of these pre-configured accounts:

| Role | Email | Password | What you can test |
|---|---|---|---|
| 🩺 **Doctor** | `doctor@healthforecast.ai` | `password123` | Register patients, add clinical notes, prescribe medications, update vitals, discharge patients |
| 🏦 **Hospital Admin** | `admin@healthforecast.ai` | `password123` | View hospital KPIs, bed occupancy, department recovery charts, download CSV reports |
| 🧪 **Researcher** | `researcher@healthforecast.ai` | `password123` | View anonymized demographics, readmission trends, dataset downloads |
| 💻 **System Admin** | `sysadmin@healthforecast.ai` | `prasad1234` | Manage staff accounts, edit user roles, check audit logs, view AI model status |

---

## 10. Summary of Key Improvements Made

1. **Clean White & Red Theme:** Swapped the previous dark theme across all 25+ pages and components for a crisp, professional white clinical look with red highlights.
2. **3D Visuals:** Added interactive mouse-tracking 3D TiltCards, a perspective grid in the hero section, and floating stats.
3. **Full Doctor Write Operations:** Fixed missing backend schema defaults (such as `admissionDate`) and added interactive modals for clinical notes, vitals, medications, and discharges.
4. **Resilient Data Layer:** Connected all frontend pages to live Express REST APIs with an automatic localStorage fallback, so testing works smoothly even without an active database connection.
5. **Git Repository Clean-up:** Fixed submodule conflicts, added a clean root `.gitignore`, and set up proper tracking.
