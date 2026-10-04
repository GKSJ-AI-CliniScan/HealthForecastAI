# Milestone 1 Report – Week 1 & 2
## Project Initialization, Design Process & Core Setup

- **Intern Name:** Liya Babu
- **Branch:** `intern/22-liya-babu`
- **Project:** HealthForecastAI – Hospital Readmission Prediction & Patient Risk Intelligence System
- **Milestone:** Milestone 1
- **Duration:** Week 1 & Week 2

---

## Scope for this Milestone

- Define healthcare workflows and project objectives.
- Design the system architecture and database schema.
- Set up frontend and backend environments.
- Implement authentication and role-based access control.
- Implement user permissions and dashboard access management.
- Integrate the Diabetes 130-US Hospitals Dataset.
- Build patient management and healthcare dashboard workflows.

---

## Evaluation Criteria

- Project initialization and architecture setup completed.
- Authentication and role-based access control implemented.
- Patient management workflow implemented.
- Healthcare dashboard functional.
- Dataset integration and preprocessing completed.

---

## What I Built

### 1. System Architecture & Database

- Set up the FastAPI backend and PostgreSQL database.
- Implemented relational database tables for healthcare data including:
  - `users`
  - `patients`
  - `admissions`
  - `audit_logs`
  - `risk_predictions`
- Integrated the Diabetes 130-US Hospitals dataset.
- Loaded **69,668 unique patients** and **99,637 admission records** into PostgreSQL.
- Implemented database-backed patient and admission workflows.

### 2. Authentication & Role-Based Access Control

- Implemented JWT-based authentication.
- Implemented role-based permissions for:
  - Doctor
  - Hospital Administrator
  - Healthcare Researcher
  - System Administrator
- Protected API endpoints using permission-based access control.
- Verified that unauthorized access is rejected.

### 3. Patient Management

- Implemented PostgreSQL-backed patient management.
- Added patient listing and patient-related API workflows.
- Connected the patient dashboard to real PostgreSQL data.
- Implemented patient access according to the configured permissions.

### 4. Healthcare Dashboard

- Built and integrated the clinical healthcare dashboard.
- Added patient information and healthcare analytics sections.
- Connected dashboard workflows with backend APIs.
- Implemented role-based dashboard access.

---

## Database Metrics

| Metric | Value |
|---|---:|
| Users | 5 |
| Unique Patients | 69,668 |
| Admissions | 99,637 |
| Risk Predictions | 99,637 |

---

## Validation & Testing

- Verified that the FastAPI backend starts successfully.
- Verified PostgreSQL database connectivity.
- Verified patient data is retrieved from the database.
- Tested authentication and role-based access.
- Verified unauthorized access is denied.
- Tested the healthcare dashboard with backend data.
- Verified patient management workflows.

---

## How to Run

### Start the Backend

```bash
uvicorn app.main:app --app-dir backend --reload --port 8000