# Milestone 1 Report – Week 1 & 2 – Frontend Development & Healthcare Dashboard Setup

- **Intern name:** Liya Babu
- **Branch:** `intern/22-liya-babu`
- **Submitted on:** August 28, 2026

---

## Scope for this milestone

- Understand the HealthForecastAI project requirements and healthcare workflows.
- Set up and explore the existing frontend and dashboard structure.
- Develop healthcare dashboard interfaces for different user roles.
- Organize dashboard pages and frontend assets.
- Improve dashboard layout, styling, navigation, and usability.
- Prepare dashboard interfaces for integration with backend APIs.
- Support the presentation of patient information, risk prediction results, and hospital analytics.

## Evaluation criteria

- Frontend dashboard structure established.
- Healthcare dashboard pages accessible and organized.
- Role-specific dashboard interfaces prepared.
- Consistent styling, typography, and navigation.
- Frontend structure prepared for backend integration.
- Dashboard implementation aligned with healthcare workflows.

---

## What I built

### 1. Frontend Setup and Dashboard Structure

- Worked with the HealthForecastAI frontend dashboard structure under `static/dashboards/`.
- Explored and organized dashboard pages and related frontend assets.
- Worked on the presentation and layout of healthcare dashboard interfaces.
- Maintained the frontend structure within the existing project repository.

### 2. Multi-Role Healthcare Dashboard

- Worked on the frontend dashboard experience for the healthcare platform.
- Supported dashboard interfaces for the following user roles:
  - Doctors
  - Hospital Administrators
  - Healthcare Researchers
  - System Administrators
- Organized dashboard sections according to the information and workflows required by each role.

### 3. Dashboard UI and User Experience

- Worked on dashboard layouts, typography, styling, and information presentation.
- Improved the organization and readability of dashboard content.
- Focused on consistent visual presentation across dashboard pages.
- Prepared dashboard sections for displaying patient information, readmission-risk information, and healthcare analytics.

### 4. Patient and Healthcare Information Presentation

- Organized dashboard areas for patient-related information and healthcare workflows.
- Supported the frontend presentation of clinical information and operational analytics.
- Prepared dashboard views for displaying risk categories and patient information when supported by the available data and backend integration.

### 5. Frontend and Backend Integration Readiness

- Worked within the existing HealthForecastAI project structure.
- Prepared dashboard interfaces for integration with the FastAPI backend.
- Aligned the frontend structure with the project's planned patient management, risk prediction, and analytics workflows.

---

## How to run it

### Start the Frontend

Open the HealthForecastAI project in VS Code and start Live Server for the following file:

`static/dashboards/clinical_precision_narrative/index.html`

### Open the Dashboard

Open the Clinical Precision Narrative dashboard in your browser:

`http://localhost:5500/static/dashboards/clinical_precision_narrative/index.html#hospital`

The `#hospital` fragment selects the hospital section of the dashboard.

### Start the Backend (if required)

From the HealthForecastAI project root, run:

```bash
uvicorn app.main:app --app-dir backend --reload --port 8000
```

### API Documentation

Open the FastAPI Swagger UI:

`http://localhost:8000/docs`

The frontend runs through Live Server on port `5500`. The backend runs separately on port `8000` when required for API integration.

---

## Evidence

### Frontend Dashboard Implementation

- **Dashboard:** Clinical Precision Narrative
- **Dashboard source file:** `static/dashboards/clinical_precision_narrative/index.html`
- **Dashboard URL:** `http://localhost:5500/static/dashboards/clinical_precision_narrative/index.html#hospital`
- **Selected section:** Hospital
- **Frontend assets:** HTML dashboard pages and their associated assets.
- **Backend integration target:** FastAPI endpoints for healthcare data and analytics.

### Frontend Validation

The dashboard HTML files and associated assets can be checked using the project's validation scripts and CI workflows. Only confirmed validation results should be reported as completed evidence.

---

## Metrics

The following describe the scope of the frontend work:

- **Primary contribution:** Frontend development and dashboard UI.
- **Dashboard source directory:** `http://localhost:5500/static/dashboards/clinical_precision_narrative/index.html#hospital`
- **Main dashboard:** Clinical Precision Narrative.
- **Target user roles:** 4 — Doctor, Hospital Administrator, Healthcare Researcher, and System Administrator.
- **Integration target:** HealthForecastAI FastAPI backend.
- **Validation status:** To be recorded using the actual results from the project's CI and validation checks.

---

## Known gaps

- Complete integration of live backend data into all dashboard components may require further work.
- End-to-end validation of dashboard workflows depends on backend availability and API integration.
- Additional dashboard refinements may be completed during subsequent milestones.
