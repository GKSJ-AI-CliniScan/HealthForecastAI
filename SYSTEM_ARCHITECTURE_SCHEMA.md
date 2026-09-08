# 🏛️ HealthForecast AI — System Architecture & Database Schema Specification
**Project:** Hospital Readmission Prediction & Patient Risk Intelligence System  
**Milestone:** 1 — Project Initialization, MVC Architecture, Database Schema & Core Setup  
**Tech Stack:** MERN (MongoDB, Express.js, React 19, Node.js)  

---

## 1. 🌐 High-Level System Architecture

HealthForecast AI utilizes a **Decoupled 3-Tier MVC Architecture** built entirely on the MERN stack:

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                           PRESENTATION TIER                             │
 │  React 19 + Vite + Tailwind CSS v4 + Recharts + Lucide Icons           │
 │                                                                         │
 │  ┌─────────────────┬──────────────────┬─────────────────┬────────────┐  │
 │  │ 🩺 Doctor Portal│ 🏦 Admin Portal  │ 🧪 Research Lab │💻 Sys Admin│  │
 │  └────────┬────────┴────────┬─────────┴────────┬────────┴─────┬──────┘  │
 └───────────┼─────────────────┼──────────────────┼──────────────┼─────────┘
             │                 │                  │              │
             └─────────────────┼──────────────────┴──────────────┘
                               │ JSON / HTTPS (JWT Bearer Auth)
                               ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                           APPLICATION TIER                              │
 │                      Node.js / Express.js (MVC)                         │
 │                                                                         │
 │  ┌──────────────────────────────────────────────────────────────────┐   │
 │  │  Middleware Pipeline:                                            │   │
 │  │  - CORS & Morgan Logger                                          │   │
 │  │  - JWT Token Authentication Guard (`protect`)                    │   │
 │  │  - Role-Based Access Control (`authorizeRoles`)                  │   │
 │  │  - Centralized Error & Exception Handler                         │   │
 │  └──────────────────────────────────┬───────────────────────────────┘   │
 │                                     │                                   │
 │  ┌──────────────────────────────────▼───────────────────────────────┐   │
 │  │  Controllers (Business Logic Layer):                             │   │
 │  │  - `authController.js`       (JWT, Bcrypt, Profiles)             │   │
 │  │  - `patientController.js`    (CRUD, Risk Filters, Doctor Query)  │   │
 │  │  - `analyticsController.js`  (KPIs, Anonymized Research Cohorts) │   │
 │  │  - `adminController.js`      (Users, Audit Logging, Datasets)    │   │
 │  └──────────────────────────────────┬───────────────────────────────┘   │
 └─────────────────────────────────────┼───────────────────────────────────┘
                                       │ Mongoose ODM
                                       ▼
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                              DATA TIER                                  │
 │                          MongoDB Collections                            │
 │                                                                         │
 │  ┌──────────────┬──────────────┬──────────────┬──────────────┬────────┐ │
 │  │    Users     │   Patients   │  Encounters  │  AuditLogs   │Datasets│ │
 │  └──────────────┴──────────────┴──────────────┴──────────────┴────────┘ │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 🗂️ MVC Directory Structure

```text
infosys/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & resilience configuration
│   ├── controllers/
│   │   ├── authController.js     # User registration, login, profile management
│   │   ├── patientController.js  # Patient CRUD, risk filtering, worksheets
│   │   ├── analyticsController.js# Hospital KPIs, monthly trends, research cohorts
│   │   └── adminController.js    # User RBAC, audit trails, system stats
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & role authorization guards
│   │   ├── errorMiddleware.js    # Centralized REST error handler
│   │   └── auditMiddleware.js    # Automatic action audit trail recorder
│   ├── models/
│   │   ├── User.js               # Staff credentials, roles & permissions
│   │   ├── Patient.js            # Clinical profile, vitals, insights, risk scores
│   │   ├── Encounter.js          # Inpatient hospital encounters
│   │   ├── AuditLog.js           # Security & compliance audit trail
│   │   └── Dataset.js            # Cohort dataset registries
│   ├── routes/
│   │   ├── authRoutes.js         # /api/v1/auth
│   │   ├── patientRoutes.js      # /api/v1/patients
│   │   ├── analyticsRoutes.js    # /api/v1/analytics
│   │   └── adminRoutes.js        # /api/v1/admin
│   ├── utils/
│   │   └── seeder.js             # Database populator for 4 roles & clinical records
│   ├── .env                      # Environment configurations
│   ├── package.json              # Backend dependencies and run scripts
│   └── server.js                 # Application bootstrap & route dispatcher
│
└── frontend/
    ├── src/
    │   ├── components/           # Common components, modals, dashboard layouts
    │   ├── context/              # AuthContext & global reactive sessions
    │   ├── data/                 # Rich fallback mock database
    │   ├── pages/                # Role-specific dashboard views & worksheets
    │   │   ├── auth/             # Multi-role login portal
    │   │   ├── doctor/           # Clinical insights, patients, readmission forecasting
    │   │   ├── hospital-admin/   # Department analytics, billing, KPI telemetry
    │   │   ├── researcher/       # Anonymized population health & trends
    │   │   └── system-admin/     # System admin panel, user RBAC, audit logs
    │   └── services/             # Axios REST client layer with offline fallback
    └── package.json
```

---

## 3. 🗄️ Database Schemas & Collection Specifications

### 3.1 `User` Collection
Stores staff and administrative accounts with encrypted credentials and granular permissions.

| Field | Type | Required | Unique | Description |
|---|---|:---:|:---:|---|
| `userId` | `String` | Yes | Yes | Human-readable ID (e.g. `U-101`) |
| `name` | `String` | Yes | No | Full Name |
| `email` | `String` | Yes | Yes | Login email address (lowercase) |
| `password` | `String` | Yes | No | Bcrypt hashed password (min 6 chars) |
| `role` | `String` | Yes | No | `doctor`, `hospital-admin`, `researcher`, `system-admin` |
| `specialty` | `String` | No | No | Clinical specialty (e.g. Cardiology & Endocrinology) |
| `department`| `String` | No | No | Hospital department (e.g. Hospital Administration) |
| `hospitalBranch` | `String` | No | No | Hospital facility affiliation |
| `institution` | `String` | No | No | Research institute affiliation |
| `clearance` | `String` | No | No | System clearance tier (e.g. Level 5) |
| `avatar` | `String` | No | No | Image URL or base64 avatar |
| `assignedPatientsCount` | `Number` | No | No | Count of active patients under clinician's care |
| `active` | `Boolean`| No | No | Account status (`true` = Active, `false` = Suspended) |
| `createdAt` | `Date` | Auto | No | Timestamp of creation |

---

### 3.2 `Patient` Collection
Stores patient clinical worksheets, vital signs, risk telemetry, and clinical insights.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Unique patient code (e.g. `HFC-001`) |
| `name` | `String` | Full name of patient |
| `age` | `Number` | Age in years |
| `gender` | `String` | `Male`, `Female`, or `Other` |
| `admissionDate` | `String` | Admission date string (YYYY-MM-DD) |
| `dischargeDate` | `String` | Discharge date or null if currently admitted |
| `diagnosis` | `String` | Primary clinical diagnosis text |
| `riskLevel` | `String` | `High`, `Medium`, or `Low` |
| `readmissionProbability` | `Number` | Readmission risk percentage (0–100%) |
| `treatmentStatus` | `String` | `Stable`, `Improving`, `Critical`, `Under Observation`, `Discharged` |
| `assignedDoctor` | `String` | Attending physician name |
| `contact` | `Object` | Phone, Email, and Residential Address |
| `medicalHistory` | `Array` | Prior encounters: `{ id, date, diagnosis, severity, hospital }` |
| `riskFactors` | `Array` | List of high-risk clinical factors (e.g. HbA1c > 8.0%, LVEF < 35%) |
| `treatmentHistory` | `Array` | List of administered medications and therapies |
| `recoveryProgress` | `Object` | `{ score, medicationAdherence, comorbiditiesCount, bpReading }` |
| `clinicalInsights` | `Object` | `{ riskMitigation, careRecommendations, followUpPlanning, dischargeRecommendations }` |
| `hba1cResult` | `String` | `>8`, `>7`, `Norm`, `None` |
| `diabetesMed` | `Boolean`| Indicates active diabetic medication prescription |

---

### 3.3 `Encounter` Collection
Tracks acute care inpatient hospital encounters.

| Field | Type | Description |
|---|---|---|
| `encounterId` | `String` | Unique hospital encounter sequence number |
| `patientId` | `String` | Reference to patient record |
| `admissionType` | `String` | `Emergency`, `Elective`, `Urgent`, `Trauma` |
| `timeInHospital` | `Number` | Length of hospital stay in days (1–14) |
| `numLabProcedures`| `Number` | Total laboratory diagnostic tests performed |
| `numMedications` | `Number` | Number of distinct medications administered |
| `numberDiagnoses`| `Number` | Count of registered comorbidities and diagnoses |
| `primaryDiagnosisIcd9` | `String` | Primary ICD-9 code |
| `a1cResult` | `String` | HbA1c screening outcome (`>8`, `>7`, `Norm`, `None`) |
| `insulin` | `String` | Insulin dosage adjustment (`No`, `Steady`, `Up`, `Down`) |
| `readmitted30Days`| `Boolean`| Early hospital readmission flag |

---

### 3.4 `AuditLog` Collection
Security, compliance, and clinical change audit trails.

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Audit log event identifier (e.g. `AL-5801`) |
| `user` | `String` | Operator name or email |
| `role` | `String` | Operator role |
| `action` | `String` | Description of operation performed |
| `module` | `String` | System module (Authentication, Patient Care, User Management) |
| `timestamp` | `String` | Timestamp of event |
| `status` | `String` | `Success`, `Warning`, or `Failed` |
| `ipAddress` | `String` | Client IP address |

---

## 4. 🔐 Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint | Doctor / Clinician | Hospital Admin | Researcher | System Admin |
|---|:---:|:---:|:---:|:---:|
| **Authentication & Profile** | ✅ View / Edit Own | ✅ View / Edit Own | ✅ View / Edit Own | ✅ View / Edit Own |
| **Patient Clinical Registry** | ✅ Full Access | ✅ Read Only | ❌ Forbidden | ✅ Full Access |
| **Patient Worksheets & Insights** | ✅ Create / Edit | ✅ Read Only | ❌ Forbidden | ✅ Full Access |
| **Hospital Analytics & KPIs** | 🟡 View KPIs | ✅ Full Access | ❌ Forbidden | ✅ Full Access |
| **Department Performance** | ❌ Forbidden | ✅ Full Access | ❌ Forbidden | ✅ Full Access |
| **Anonymized Research Cohorts**| ❌ Forbidden | ❌ Forbidden | ✅ Full Access | ✅ Full Access |
| **Population Trends** | ❌ Forbidden | ❌ Forbidden | ✅ Full Access | ✅ Full Access |
| **User Account Management** | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden | ✅ Full Access |
| **Security Audit Logs** | ❌ Forbidden | ❌ Forbidden | ❌ Forbidden | ✅ Full Access |

---

## 5. 📡 REST API Endpoint Catalogue

### 🔐 Authentication (`/api/v1/auth`)
* `POST /login` — Authenticate credentials with bcrypt, issue signed JWT.
* `POST /register` — Register new user account.
* `GET  /me` — Retrieve active profile using JWT token.
* `PUT  /profile` — Update username, avatar, or specialty.

### 🩺 Patient Management (`/api/v1/patients`)
* `GET    /` — List all patients with search, risk filters (`High`, `Medium`, `Low`), and pagination.
* `GET    /:id` — Retrieve full patient clinical record, vitals, insights, and history.
* `POST   /` — Register new patient record with clinical insights scaffolding.
* `PUT    /:id` — Update patient clinical notes, treatment status, and recommendations.
* `DELETE /:id` — Delete patient record (Admin only).
* `GET    /doctor/:doctorName` — List patients assigned to a specific physician.

### 📊 Analytics (`/api/v1/analytics`)
* `GET /hospital-dashboard` — Retrieve hospital KPIs, readmission rates, and departmental breakdown.
* `GET /research` — Retrieve strictly anonymized population health cohorts (HIPAA/GDPR safe).

### 💻 System Admin (`/api/v1/admin`)
* `GET  /dashboard` — System telemetry counts (users, datasets, logs).
* `GET  /users` — List all user accounts and status.
* `POST /users` — Create staff user account.
* `PUT  /users/:id/status` — Toggle user activation status (Active / Suspended).
* `PUT  /users/:id/role` — Reassign user role.
* `GET  /audit-logs` — Retrieve security and activity audit trails.
* `GET  /datasets` — List research datasets.
* `POST /datasets` — Upload and register new dataset metadata.
