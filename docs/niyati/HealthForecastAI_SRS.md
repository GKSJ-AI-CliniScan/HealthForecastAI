# HealthForecast AI - Software Requirements Specification

**Document Version:** 1.0
**Status:** Draft for Internal / Mentor Review
**Project:** HealthForecast AI: Hospital Readmission Prediction & Patient Risk Intelligence System

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional, non-functional, data, and architectural requirements for **HealthForecast AI**, an AI-powered healthcare analytics platform that predicts hospital readmissions, identifies high-risk patients, evaluates treatment effectiveness, and supports proactive patient care planning. This document serves as the authoritative reference for design, development, testing, and evaluation of the system and is intended to be implementation-ready.

### 1.2 Scope

HealthForecast AI is a centralized, web-based healthcare analytics platform covering:

- Patient risk prediction using machine learning classification models
- Hospital readmission probability forecasting (30-day / 90-day horizons)
- Treatment effectiveness analysis and recovery trend monitoring
- Clinical decision support (care recommendations, discharge planning, risk mitigation)
- Healthcare analytics dashboards for hospital-wide and population-level insight
- Role-based multi-tenant access for Doctors, Hospital Administrators, Healthcare Researchers, and System Administrators
- Secure audit logging, reporting, and data governance

The system is **not** an Electronic Health Record (EHR) replacement, is **not** a real-time bedside monitoring device, and does **not** provide autonomous clinical decisions — all AI outputs are decision-support artifacts requiring clinician review. Out-of-scope items (billing, insurance claims processing, pharmacy inventory) are noted where relevant in Section 13.

### 1.3 Intended Audience

| Audience | Interest in this Document |
|---|---|
| Software Architects | System structure, module boundaries, API and data contracts |
| Healthcare Domain Experts | Clinical workflow accuracy, safety, and terminology validation |
| AI/ML Engineers | Model requirements, feature engineering, dataset strategy, evaluation metrics |
| Project Mentors / Reviewers | Milestone alignment, completeness, feasibility |
| Technical Evaluators | Traceability, measurable KPIs, testability |
| Internship Review Panels | Deliverable scope, week-wise mapping, evaluation criteria |

### 1.4 Definitions and Acronyms

| Term | Definition |
|---|---|
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token, used for stateless authentication |
| EHR | Electronic Health Record |
| ROC-AUC | Receiver Operating Characteristic - Area Under Curve, a classification metric |
| F1-Score | Harmonic mean of precision and recall |
| CDS | Clinical Decision Support |
| PII | Personally Identifiable Information |
| PHI | Protected Health Information |
| CI/CD | Continuous Integration / Continuous Deployment |
| SRS | Software Requirements Specification |
| KPI | Key Performance Indicator |
| DFD | Data Flow Diagram |
| ERD | Entity Relationship Diagram |
| XGBoost | Extreme Gradient Boosting, a gradient-boosted decision tree ML algorithm |
| Readmission | A patient returning for inpatient hospital care within a defined window after discharge |

### 1.5 References

- India Hospital Readmission Dataset (2015–2024) — Kaggle: `digutlaranjithkumar/india-hospital-readmission-dataset-20152024`
- Synthea Synthetic Patient Population Simulator — `synthea.mitre.org` / GitHub: `synthetichealth/synthea`
- Project source brief: *HealthForecast AI* internship project document (attached PDF)
- IEEE 830 / ISO/IEC/IEEE 29148 SRS structuring conventions (used as a structural template only)

### 1.6 Document Overview

Section 2 introduces the project. Sections 3–5 define the problem, business, and technical objectives. Section 6 profiles stakeholders. Sections 7–9 specify functional requirements, non-functional requirements, and RBAC. Section 10 documents use cases. Section 11 defines dataset requirements. Sections 12–13 cover risk, assumptions, and constraints. Sections 14–15 define success criteria and traceability.

---

## 2. Project Overview

HealthForecast AI is a full-stack, AI-driven healthcare intelligence platform designed to help hospitals and healthcare organizations move from **reactive** to **proactive** patient care. The system ingests historical admission, discharge, diagnosis, medication, and vitals data, trains machine learning models (XGBoost, Random Forest) to estimate a patient's probability of readmission and overall health risk, and surfaces these predictions through role-specific dashboards.

**What the system does:**
- Continuously scores patients for readmission risk and general health risk using trained ML models
- Categorizes patients into Low / Medium / High risk tiers with explainable probability scores
- Analyzes treatment and medication effectiveness against recovery outcomes
- Generates clinical decision support recommendations (follow-up plans, discharge checklists, risk mitigation actions)
- Aggregates hospital-wide and population-level analytics for administrators and researchers
- Maintains a full audit trail of every prediction, access, and administrative action

**Why it is needed:**
Hospitals frequently discharge patients without a systematic, data-driven understanding of their readmission risk. This leads to avoidable readmissions, delayed intervention, and inefficient use of clinical resources. HealthForecast AI closes this gap using historical data patterns.

**Healthcare challenges addressed:**
- Lack of early warning signals for high-risk patients before discharge
- Manual, inconsistent identification of at-risk patients across departments
- Limited visibility into which treatments are actually improving recovery outcomes
- Absence of a unified reporting layer connecting clinical and administrative decision-making

**Readmission prediction problem:** Given a patient's demographics, diagnosis history, admission details, medications, and prior visit history, estimate the probability that the patient will be readmitted within a defined follow-up window, and classify the case into an actionable risk tier.

**Risk intelligence problem:** Beyond a single readmission number, the system must synthesize multiple risk signals (comorbidities, vitals trends, medication adherence proxies, prior admission frequency) into a holistic patient risk profile usable by clinicians in daily rounds.

**Business value:** Reduced readmission penalties and costs, improved patient outcomes, better resource planning (beds, staff, follow-up capacity), and a defensible, auditable data trail for compliance and research purposes.

---

## 3. Problem Statement

| Challenge Area | Description |
|---|---|
| Hospital readmission challenges | Readmissions are costly and often preventable, but hospitals lack systematic, quantified early-warning tools to flag at-risk patients before discharge. |
| Delayed risk identification | Risk factors (comorbidities, unstable vitals, medication complexity) are often recognized only after a patient has already deteriorated or been readmitted. |
| Clinical decision-making challenges | Doctors must synthesize large volumes of unstructured patient history manually, under time pressure, without standardized risk scoring. |
| Healthcare resource optimization | Hospitals cannot efficiently allocate beds, staff, and follow-up resources without predictive visibility into readmission volume and patient acuity. |
| Reporting inefficiencies | Hospital performance, patient outcomes, and treatment effectiveness are frequently reported through manual, fragmented, retrospective processes. |
| Population health visibility issues | Researchers and public health stakeholders lack anonymized, aggregated views of readmission and treatment trends across time and geography. |

---

## 4. Business Objectives

| # | Objective | Description |
|---|---|---|
| B1 | Reduce avoidable readmissions | Provide early, quantified risk signals so care teams can intervene before discharge or during follow-up. |
| B2 | Improve patient outcomes | Support proactive, personalized care planning driven by risk and treatment-effectiveness insight. |
| B3 | Improve healthcare efficiency | Streamline patient risk review and reporting into a single centralized platform. |
| B4 | Enable data-driven decision making | Replace ad hoc clinical judgment-only decisions with model-backed, explainable risk scores. |
| B5 | Improve resource allocation | Give administrators forward-looking visibility into expected readmission and risk volume for staffing/bed planning. |
| B6 | Support preventive interventions | Surface actionable, prioritized care recommendations tied to each patient's specific risk drivers. |

---

## 5. Technical Objectives

| # | Objective | Description |
|---|---|---|
| T1 | Risk prediction | Build and serve ML classification models that output calibrated per-patient risk scores. |
| T2 | Readmission forecasting | Predict readmission probability within defined time windows using historical admission patterns. |
| T3 | Healthcare analytics | Provide aggregate, trend, and comparative analytics across patients, departments, and hospitals. |
| T4 | Clinical insights | Translate model outputs into human-readable, prioritized clinical recommendations. |
| T5 | Dashboard reporting | Deliver role-specific dashboards with exportable reports (PDF/Excel). |
| T6 | Auditability | Log every prediction, data access, and administrative action with immutable audit trails. |
| T7 | Scalability | Support horizontal scaling of API, ML inference, and database layers as patient volume grows. |

---

## 6. Stakeholder Analysis

| Stakeholder | Responsibilities | Benefits | System Interaction |
|---|---|---|---|
| Doctor | Monitor patient risk, review readmission predictions, evaluate treatment effectiveness, support discharge planning | Faster, data-backed identification of at-risk patients; reduced manual review time | Patient dashboard, risk score view, CDS recommendations, outcome reports (assigned patients only) |
| Hospital Administrator | Hospital performance monitoring, resource utilization oversight, patient outcome management, operational analytics | Forward-looking operational visibility; defensible performance reporting | Hospital-wide dashboards, readmission statistics, operational and analytics reports |
| Healthcare Researcher | Healthcare analytics research, clinical outcome analysis, population health studies, treatment effectiveness evaluation | Access to anonymized, aggregated datasets for research without compromising patient privacy | Aggregated analytics views, anonymized dataset export, trend reports |
| System Administrator | Platform administration, user/role management, security monitoring, AI model deployment | Full operational control and governance of the platform | User management, RBAC configuration, audit logs, model management, all dashboards |
| Patient (indirect beneficiary) | N/A (non-system-user in v1 scope) | Improved care quality, reduced avoidable readmission, better follow-up planning | No direct login in current scope; benefits realized through clinician actions |

---

## 7. Functional Requirements

### 7.1 Authentication & Authorization

| Requirement ID | Description | Inputs | Processing | Outputs | Priority |
|---|---|---|---|---|---|
| FR-AUTH-01 | Users shall authenticate via email/username and password | Credentials | Validate against hashed password store; issue JWT | Access token, refresh token | High |
| FR-AUTH-02 | System shall enforce role-based authorization on every API endpoint | JWT, requested resource | Decode JWT, check role/permission claims | Allow/Deny (403) | High |
| FR-AUTH-03 | System shall support token refresh without re-login | Refresh token | Validate refresh token, issue new access token | New JWT access token | Medium |
| FR-AUTH-04 | System shall support secure password reset | Registered email | Generate time-limited reset token, send via email | Reset confirmation | Medium |
| FR-AUTH-05 | System shall lock accounts after repeated failed login attempts | Login attempt count | Track failures, apply temporary lockout | Lockout status | Medium |

### 7.2 User Management

| Requirement ID | Description | Inputs | Processing | Outputs | Priority |
|---|---|---|---|---|---|
| FR-USR-01 | System Administrator shall create, update, deactivate user accounts | User profile data, role | Validate uniqueness, persist user record | Created/updated user record | High |
| FR-USR-02 | System shall assign exactly one primary role per user (Doctor, Hospital Administrator, Healthcare Researcher, System Administrator) | Role selection | Validate against RBAC role list | Role-bound user account | High |
| FR-USR-03 | System shall allow Doctors to be scoped to assigned patients only | Doctor-patient assignment mapping | Enforce scope filter on all patient queries | Filtered patient list | High |
| FR-USR-04 | System Administrator shall view and manage all user accounts | Search/filter criteria | Query user table | Paginated user list | Medium |

### 7.3 Patient Management

| Requirement ID | Description | Inputs | Processing | Outputs | Priority |
|---|---|---|---|---|---|
| FR-PAT-01 | System shall store patient demographic and medical history records | Patient demographic/medical data | Validate schema, persist to database | Patient record | High |
| FR-PAT-02 | System shall track admission and discharge history per patient | Admission/discharge events | Link events to patient record with timestamps | Admission history timeline | High |
| FR-PAT-03 | System shall track medications and treatment records per patient | Medication/treatment data | Persist with linkage to admission episode | Medication/treatment log | High |
| FR-PAT-04 | Doctors shall retrieve only records of assigned patients; Administrators view-only across hospital; Researchers view anonymized only | User role, patient ID | Apply RBAC + scope filter | Authorized patient view | High |

### 7.4 Risk Prediction

| Requirement ID | Description | Inputs | Processing | Outputs | Priority |
|---|---|---|---|---|---|
| FR-RISK-01 | System shall compute a patient risk score using trained ML models | Patient features (demographics, vitals, history) | Feature preprocessing → model inference | Risk score (0–1), risk tier | High |
| FR-RISK-02 | System shall categorize patients into Low / Medium / High risk tiers | Risk score | Apply threshold-based categorization logic | Risk tier label | High |
| FR-RISK-03 | System shall flag and list high-risk patients for clinician review | Risk tier | Filter patients above High-risk threshold | High-risk patient list/alert | High |
| FR-RISK-04 | System shall persist historical risk scores for trend tracking | Risk score, timestamp, patient ID | Append to prediction history table | Risk score history | Medium |

### 7.5 Readmission Prediction

| Requirement ID | Description | Inputs | Processing | Outputs | Priority |
|---|---|---|---|---|---|
| FR-READM-01 | System shall predict probability of readmission within a defined time window | Patient admission/discharge features | Model inference (XGBoost/Random Forest ensemble) | Readmission probability (%) | High |
| FR-READM-02 | System shall generate a confidence score alongside each prediction | Model output probabilities | Derive confidence from model output distribution | Confidence score | Medium |
| FR-READM-03 | System shall track readmission trends over time per hospital/department | Historical readmission predictions/outcomes | Aggregate by time period | Trend report/chart data | Medium |
| FR-READM-04 | System shall log actual readmission outcomes to support model retraining | Discharge + subsequent admission event | Compare predicted vs. actual outcome | Model performance feedback record | Medium |

### 7.6 Clinical Decision Support

| Requirement ID | Description | Inputs | Processing | Outputs | Priority |
|---|---|---|---|---|---|
| FR-CDS-01 | System shall generate care recommendations based on risk drivers | Risk score, contributing features | Rule-based + model-explanation mapping | Ranked care recommendations | High |
| FR-CDS-02 | System shall generate follow-up planning suggestions | Discharge data, risk tier | Map risk tier to follow-up cadence template | Follow-up plan | Medium |
| FR-CDS-03 | System shall provide risk mitigation suggestions for high-risk patients | High-risk flag, risk drivers | Match drivers to mitigation action library | Mitigation suggestion list | Medium |
| FR-CDS-04 | System shall generate discharge support recommendations | Patient risk profile | Combine risk tier + comorbidity rules | Discharge checklist | Medium |

### 7.7 Healthcare Analytics

| Requirement ID | Description | Inputs | Processing | Outputs | Priority |
|---|---|---|---|---|---|
| FR-ANL-01 | System shall generate hospital-wide readmission analytics | Aggregated prediction/outcome data | Aggregate queries, statistical summarization | Readmission analytics dashboard | High |
| FR-ANL-02 | System shall generate patient outcome analysis views | Outcome + treatment data | Cross-tabulate outcomes vs. treatment | Outcome analysis report | Medium |
| FR-ANL-03 | System shall visualize healthcare trends over time | Time-series prediction/outcome data | Time-bucketed aggregation | Trend charts | Medium |
| FR-ANL-04 | System shall provide anonymized aggregate views for researchers | Raw patient data | De-identification/aggregation pipeline | Anonymized dataset/report | High |

### 7.8 Reporting Module

| Requirement ID | Description | Inputs | Processing | Outputs | Priority |
|---|---|---|---|---|---|
| FR-RPT-01 | System shall export analytics reports in PDF and Excel formats | Report parameters | Render report template, generate file | Downloadable PDF/XLSX | Medium |
| FR-RPT-02 | System shall generate scheduled/on-demand operational reports for administrators | Reporting period, filters | Query + aggregate + format | Operational report | Medium |
| FR-RPT-03 | System shall generate patient outcome reports for doctors | Patient ID, date range | Query patient outcome history | Patient outcome report | Medium |

### 7.9 Audit Logging

| Requirement ID | Description | Inputs | Processing | Outputs | Priority |
|---|---|---|---|---|---|
| FR-AUD-01 | System shall log every authentication event | Login/logout event | Write immutable audit record | Audit log entry | High |
| FR-AUD-02 | System shall log every access to patient records | Access event (user, patient, timestamp) | Write immutable audit record | Audit log entry | High |
| FR-AUD-03 | System shall log every prediction request and result | Prediction request/response | Write immutable audit record | Audit log entry | Medium |
| FR-AUD-04 | System Administrator shall query and export audit logs | Filter criteria (user, date, action type) | Query audit log store | Filtered audit log export | Medium |

---

## 8. Non-Functional Requirements

### Performance
- Risk/readmission prediction inference shall return within **2 seconds** (p95) per patient request.
- Dashboard pages shall load within **3 seconds** (p95) under nominal load (≤200 concurrent users).

### Scalability
- The API and ML inference layers shall support horizontal scaling to at least **10x** baseline patient record volume without architectural change.
- Database shall support partitioning/sharding readiness for multi-hospital deployment.

### Reliability
- Core prediction and patient-record services shall target **99.5%** monthly uptime.
- Failed prediction requests shall be retried automatically up to 2 times before surfacing an error.

### Availability
- Scheduled maintenance windows shall not exceed **4 hours/month** and shall be communicated in advance.

### Security
- All traffic shall be encrypted in transit via TLS 1.2+.
- Passwords shall be hashed using a strong adaptive algorithm (e.g., bcrypt/argon2).
- All endpoints shall require valid JWT except public authentication endpoints.

### Privacy
- Researcher-facing data shall be de-identified/anonymized prior to exposure.
- PII/PHI fields shall be encrypted at rest.

### Maintainability
- Codebase shall maintain modular separation between API, ML inference, and data layers to allow independent updates.
- ML models shall be versioned and independently deployable from application code.

### Usability
- Role-specific dashboards shall present only relevant modules/actions for that role (no dead UI for unauthorized actions).

### Compliance
- The system shall maintain audit trails suitable for healthcare data governance review (aligned in spirit with data protection principles; not a certified regulatory-compliance claim).

---

## 9. User Roles and Permissions

### RBAC Matrix

| Feature | Doctor | Hospital Administrator | Healthcare Researcher | System Administrator |
|---|---|---|---|---|
| Patient Records | Assigned Patients Only | View Only | Anonymized Only | Yes |
| Medical History | Assigned Patients Only | View Only | Anonymized Only | Yes |
| Risk Prediction Reports | Yes | Yes | Aggregated Only | Yes |
| Readmission Forecasts | Yes | Yes | Aggregated Only | Yes |
| Treatment Effectiveness Reports | Yes | Yes | Yes | Yes |
| Hospital Analytics Dashboard | Limited | Full Access | Aggregated Only | Full Access |
| Population Health Reports | No | Yes | Yes | Yes |
| Research Dataset Export | No | No | Yes | Yes |
| User Management | No | No | No | Yes |
| Model Management | No | No | No | Yes |

**Restrictions Summary:**
- **Doctor:** Cannot access patients outside assigned scope; cannot manage users; cannot modify AI models.
- **Hospital Administrator:** Cannot modify patient medical records; cannot alter AI prediction models.
- **Healthcare Researcher:** Cannot access PII; cannot modify patient records; cannot approve clinical decisions.
- **System Administrator:** No restrictions (full governance role).

---

## 10. Use Cases

### Use Case: Review Patient Readmission Risk
**Actors:** Doctor
**Preconditions:** Doctor is authenticated; patient is within Doctor's assigned scope.
**Main Flow:**
1. Doctor opens patient dashboard.
2. System retrieves latest risk score and readmission probability.
3. System displays risk tier, contributing factors, and CDS recommendations.
**Alternate Flow:** If no prediction exists yet, system triggers on-demand inference before display.
**Postconditions:** Doctor has an up-to-date risk view; access is logged.

### Use Case: Generate Hospital Performance Report
**Actors:** Hospital Administrator
**Preconditions:** Administrator is authenticated.
**Main Flow:**
1. Administrator selects reporting period and metrics.
2. System aggregates readmission, outcome, and operational data.
3. System renders report and offers PDF/Excel export.
**Alternate Flow:** If insufficient data exists for the period, system returns a partial report with a data-availability notice.
**Postconditions:** Report generated and optionally exported; action logged.

### Use Case: Export Anonymized Research Dataset
**Actors:** Healthcare Researcher
**Preconditions:** Researcher is authenticated; requested scope excludes PII.
**Main Flow:**
1. Researcher specifies dataset filters (condition, date range, demographics bucket).
2. System applies de-identification and aggregation rules.
3. System generates downloadable anonymized dataset.
**Alternate Flow:** If filter selection risks re-identification (very small cohort), system blocks export and requests broader filters.
**Postconditions:** Anonymized dataset delivered; export logged.

### Use Case: Manage Users and Roles
**Actors:** System Administrator
**Preconditions:** Administrator is authenticated with admin privileges.
**Main Flow:**
1. Administrator creates/updates a user account and assigns a role.
2. System validates role constraints and persists changes.
3. System applies new permissions immediately on next token refresh.
**Alternate Flow:** If role assignment conflicts with existing scope assignments (e.g., Doctor losing patient scope), system prompts for scope reassignment.
**Postconditions:** User account updated; change recorded in audit log.

### Use Case: Deploy Updated Prediction Model
**Actors:** System Administrator, AI/ML Engineer (external process)
**Preconditions:** New model version has passed evaluation thresholds.
**Main Flow:**
1. Administrator uploads/registers new model version via Model Management module.
2. System validates evaluation metrics against minimum thresholds.
3. System stages model for deployment, then promotes to production inference endpoint.
**Alternate Flow:** If evaluation metrics fall below threshold, system rejects promotion and retains current production model.
**Postconditions:** Production model updated (or rejected); action logged with metric snapshot.

---

## 11. Dataset Requirements

### India Hospital Readmission Dataset (2015–2024)

**Purpose:** Primary training and evaluation source for Patient Risk Prediction, Hospital Readmission Prediction, core ML training, healthcare analytics, and high-risk patient identification.

**Required fields (representative):**
- Patient demographic attributes (age, gender, region)
- Admission and discharge dates
- Diagnosis codes / primary condition
- Length of stay
- Prior admission count
- Medication count/type at discharge
- Readmission flag (target label) and readmission window

**Validation rules:**
- Discharge date must be on/after admission date.
- Readmission flag must be boolean/derivable from subsequent admission timestamp.
- Age and length-of-stay must fall within plausible clinical ranges (reject negative/implausible values).

**Data quality requirements:**
- Missing-value rate per critical feature documented and thresholded (e.g., reject columns with >40% missing unless imputable).
- Duplicate admission records de-duplicated by patient + admission timestamp.
- Class imbalance (readmitted vs. not) documented and addressed via resampling/weighting during training.

### Synthea Dataset

**Purpose:** Secondary/enrichment dataset for Treatment Effectiveness Analysis, Clinical Decision Support, Population Health Analytics, Patient Journey Analysis, and Dashboard Enrichment.

**Required fields (representative):**
- Synthetic patient encounters, conditions, medications, procedures
- Care plans and observations (vitals, labs)
- Longitudinal patient journey/timeline data

**Validation rules:**
- Encounter references must resolve to valid synthetic patient IDs.
- Medication/procedure codes must map to standard terminologies (e.g., SNOMED/RxNorm) shipped with Synthea output.

**Data quality requirements:**
- Synthea output is synthetic and used strictly for enrichment/demonstration of treatment-effectiveness and journey analytics — not as primary label source for readmission prediction.
- Schema alignment step required to map Synthea's FHIR-style resources into HealthForecast AI's internal patient/admission schema before use.

---

## 12. Risk Analysis

### Technical Risks

| Risk | Impact | Probability | Mitigation Strategy |
|---|---|---|---|
| ML model underperforms on real-world data distribution | High | Medium | Cross-validation, holdout testing, staged rollout with monitoring |
| Integration mismatch between Synthea (FHIR-like) and primary dataset schema | Medium | High | Build explicit schema-mapping/ETL layer before feature engineering |

### Data Risks

| Risk | Impact | Probability | Mitigation Strategy |
|---|---|---|---|
| Class imbalance skews readmission model toward majority class | High | High | Apply class weighting, SMOTE/resampling, threshold tuning |
| Incomplete/missing patient history fields | Medium | High | Define imputation strategy; flag low-confidence predictions |

### Security Risks

| Risk | Impact | Probability | Mitigation Strategy |
|---|---|---|---|
| Unauthorized access to PII/PHI | Critical | Low | RBAC enforcement, encryption at rest/in transit, audit logging |
| Token theft / session hijacking | High | Low | Short-lived JWTs, refresh token rotation, HTTPS-only cookies where applicable |

### Operational Risks

| Risk | Impact | Probability | Mitigation Strategy |
|---|---|---|---|
| Dashboard performance degradation under concurrent load | Medium | Medium | Caching layer, query optimization, load testing pre-release |
| Model drift over time as patient population changes | Medium | Medium | Scheduled retraining pipeline with performance monitoring |

### AI/ML Risks

| Risk | Impact | Probability | Mitigation Strategy |
|---|---|---|---|
| Lack of explainability undermines clinician trust | High | Medium | Provide feature-contribution explanations alongside risk scores |
| Overfitting to historical dataset (India Hospital Readmission Dataset) | Medium | Medium | Regularization, cross-hospital validation splits, evaluation on held-out time periods |

---

## 13. Assumptions and Constraints

### Dataset Assumptions
- The India Hospital Readmission Dataset (2015–2024) is assumed representative enough of target hospital populations for initial model training.
- Synthea data is assumed usable only for enrichment/demonstration, not as ground truth for readmission labels.

### Infrastructure Assumptions
- Deployment target is a cloud environment (AWS or Azure) with Docker-based containerization.
- A relational database (PostgreSQL) is available as the primary operational store; MongoDB may be used for flexible/unstructured supplementary data.

### Technical Constraints
- Backend constrained to Python/FastAPI; frontend constrained to Next.js/React/TypeScript/Tailwind CSS per project technology stack.
- ML models constrained to XGBoost and Random Forest as primary algorithms for this phase.

### Project Constraints
- 8-week milestone-driven delivery schedule (see Section 5 of source project brief).
- Academic/internship context: system is a demonstration-grade platform, not a certified clinical production system.
- Billing, insurance claims processing, and pharmacy inventory management are explicitly out of scope.

---

## 14. Success Criteria

### Prediction Metrics
- Readmission model ROC-AUC ≥ 0.75 on held-out test data.
- Risk classification F1-score ≥ 0.70 for High-risk tier identification.

### System Metrics
- Prediction inference latency ≤ 2 seconds (p95).
- Dashboard load time ≤ 3 seconds (p95).

### User Metrics
- Role-appropriate dashboard usable without requiring engineering support (validated via mentor/reviewer walkthrough).
- Zero unauthorized cross-role data access observed in RBAC testing.

### Operational Metrics
- 100% of prediction requests and patient-record accesses captured in audit logs.
- All four milestones (Weeks 2, 4, 6, 8) delivered with passing evaluation criteria per Section 6 of the source project brief.

---

## 15. Traceability Matrix

| Requirement ID | Module | API | Database Table | Test Case |
|---|---|---|---|---|
| FR-AUTH-01 | Authentication & Authorization | `POST /api/auth/login` | `users` | TC-AUTH-01 |
| FR-AUTH-02 | Authentication & Authorization | All protected endpoints (middleware) | `users`, `roles` | TC-AUTH-02 |
| FR-USR-01 | User Management | `POST /api/users` | `users` | TC-USR-01 |
| FR-USR-03 | User Management | `GET /api/users/{id}/patients` | `doctor_patient_map` | TC-USR-03 |
| FR-PAT-01 | Patient Management | `POST /api/patients` | `patients` | TC-PAT-01 |
| FR-PAT-02 | Patient Management | `GET /api/patients/{id}/admissions` | `admissions` | TC-PAT-02 |
| FR-RISK-01 | Risk Prediction | `POST /api/predictions/risk` | `predictions` | TC-RISK-01 |
| FR-RISK-02 | Risk Prediction | `GET /api/predictions/risk/{patientId}` | `predictions` | TC-RISK-02 |
| FR-READM-01 | Readmission Prediction | `POST /api/predictions/readmission` | `predictions` | TC-READM-01 |
| FR-READM-04 | Readmission Prediction | `POST /api/predictions/feedback` | `prediction_outcomes` | TC-READM-04 |
| FR-CDS-01 | Clinical Decision Support | `GET /api/cds/recommendations/{patientId}` | `care_recommendations` | TC-CDS-01 |
| FR-ANL-01 | Healthcare Analytics | `GET /api/analytics/readmissions` | `predictions`, `admissions` | TC-ANL-01 |
| FR-ANL-04 | Healthcare Analytics | `GET /api/analytics/research-export` | `patients` (anonymized view) | TC-ANL-04 |
| FR-RPT-01 | Reporting | `GET /api/reports/export` | `reports` | TC-RPT-01 |
| FR-AUD-01 | Audit Logging | Auth middleware hook | `audit_logs` | TC-AUD-01 |
| FR-AUD-02 | Audit Logging | Patient-access middleware hook | `audit_logs` | TC-AUD-02 |

---

*End of HealthForecastAI_SRS.md*
