# Milestone 4 report - Week 7 & 8 - Testing, Deployment & Documentation

- **Intern name:** Parimala M
- **Branch:** `intern/24-parimala-m`
- **Submitted on:** 2026-10-02

---

## Scope for this milestone

- Validate prediction accuracy and healthcare analytics quality.
- Optimize healthcare workflows and dashboard responsiveness.
- Deploy the platform using Docker and a cloud environment.
- Prepare the final project documentation and presentation.
- Demonstrate the complete HealthForecast AI platform.

## Evaluation criteria

- Fully deployed frontend and backend.
- Model testing and validation completed.
- Documentation and presentation prepared.
- Successful end-to-end platform demonstration completed.

---

## What I built

During Milestone 4, I completed the testing, documentation, containerization, and deployment preparation for the HealthForecast AI platform.

### Testing and validation

The application was tested across the main healthcare workflows, including:

- User authentication and role-based access.
- Patient registry and patient management.
- Readmission risk prediction.
- High-risk patient identification.
- Readmission forecasting.
- Treatment effectiveness analysis.
- Recovery trend analysis.
- Healthcare analytics and risk distribution.
- Research cohort functionality.
- Clinical support and guidance.
- Reports and exports.
- Model management and model metrics.

The frontend linting and production build were also validated.

The frontend production build completed successfully with Next.js, including all major dashboard routes.

### Frontend

The frontend was developed using:

- Next.js 15.5.23
- React
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React

The frontend includes:

- Dashboard overview
- Healthcare analytics
- Patient registry
- Risk prediction
- Readmission forecasting
- Treatment effectiveness
- Research cohort
- Reports and exports
- Clinical support
- Model management
- User management

The interface was designed as a responsive light-themed healthcare dashboard with risk indicators, KPI cards, charts, tables, loading states, error states, and permission-aware navigation.

### Backend

The backend was implemented using:

- FastAPI
- SQLAlchemy
- PostgreSQL
- Role-based access control
- REST APIs

Major backend API areas include:

- Authentication
- Patient management
- Risk prediction
- High-risk patient records
- Readmission forecasting
- Treatment analytics
- Healthcare analytics
- Reports and exports
- Model management

The backend has been deployed to a cloud environment and its API can be tested through the deployed FastAPI service.

### Machine learning

The readmission prediction system uses an XGBoost-based model.

The final model artifact is:

`readmission_model.joblib`

The model evaluation recorded the following test metrics:

- Accuracy: 0.67688
- Precision: 0.18588
- Recall: 0.54353
- F1 Score: 0.27703
- ROC-AUC: 0.66916

The selected model is XGBoost with model version:

`2.0.0-simple`

The decision threshold recorded during model evaluation is:

`0.11`

### Docker

Docker configuration was prepared for the frontend and backend so that the application can be built consistently in CI/CD environments.

The frontend Docker build successfully completed the Next.js compilation, linting, type checking, static page generation, and production optimization stages.

---

## How to run it

### Clone the repository

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI.git
cd HealthForecastAI
git checkout intern/24-parimala-m