# Milestone 4 – Model Validation, Testing and Deployment Preparation

## 1. Overview

Milestone 4 focuses on validating the AI-based hospital readmission prediction system, testing the complete application workflow, documenting the trained model, and preparing the system for deployment.

The HealthForecast AI system combines:

- Patient management
- Patient risk prediction
- Readmission forecasting
- Treatment effectiveness analysis
- Clinical decision support
- Hospital analytics
- Research-oriented anonymized patient data
- Role-based access control
- Machine learning model management

The objective of this milestone is to ensure that the implemented system is technically ready for deployment and demonstration.

---

# 2. System Components

The final system contains the following major components:

## Frontend

Technology:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- Lucide React

Frontend responsibilities:

- Authentication
- Dashboard
- Patient registry
- Risk prediction
- Readmission forecasting
- Treatment effectiveness
- Research cohort
- Clinical support
- Reports and exports
- Model management
- User management

---

## Backend

Technology:

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL

Backend responsibilities:

- Authentication
- Authorization
- Patient management
- Risk prediction
- Forecasting
- Treatment analysis
- Hospital analytics
- Clinical recommendations
- Model management
- CSV exports

---

## Machine Learning

The machine-learning component provides hospital readmission risk prediction.

The model workflow includes:

1. Dataset preparation
2. Feature processing
3. Model training
4. Model evaluation
5. Threshold selection
6. Model artifact generation
7. Backend model loading
8. Risk prediction through API

---

# 3. Model Validation

The trained model was evaluated using validation and test data.

The model evaluation includes:

- Accuracy
- Precision
- Recall
- F1-score
- ROC-AUC

The selected decision threshold is stored with the model evaluation artifacts.

The system also maintains model metadata such as:

- Model name
- Model version
- Artifact filename
- Artifact size
- Decision threshold
- Validation metrics
- Test metrics

---

# 4. Model Evaluation Results

The current model evaluation artifact reports the following test metrics.

| Metric | Result |
|---|---:|
| Accuracy | 0.6769 |
| Precision | 0.1859 |
| Recall | 0.5435 |
| F1 Score | 0.2770 |
| ROC-AUC | 0.6692 |

The recorded decision threshold is:

```text
0.11