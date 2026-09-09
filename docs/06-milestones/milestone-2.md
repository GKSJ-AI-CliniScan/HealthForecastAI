# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

- **Intern name:** Kiruthika B
- **Branch:** `intern/20-kiruthika-b`
- **Submitted on:** 09 September 2026

---

## Scope for this milestone

- Train patient risk prediction models.
- Generate patient risk scores.
- Build risk prediction dashboards.
- Develop readmission forecasting workflows.
- Generate forecasting reports.
- Build clinical insights modules.

## Evaluation criteria

- Patient risk prediction and readmission forecasting workflows implemented.
- Risk scoring and forecasting models functional.
- Clinical insights generated successfully.
- AI prediction models integrated.

---

## What I built

My track for Milestone 2 was **Frontend / UI development**: building the end-to-end user interfaces for Patient Risk Prediction and Readmission Forecasting, interactive clinical visualization components, what-if risk simulation workflows, and typed API service layers prepared for backend ML model integration.

> [!NOTE]
> **Frontend / UI Scope Notice:** Milestone 2 implementation in this branch is **FRONTEND/UI ONLY**. All risk prediction and readmission forecasting figures displayed in the UI are **simulated / mock / demo data** for interface prototyping and workflow validation. No backend ML models were trained or integrated in this phase.

### 1. Risk Prediction UI (`/risk`)

A clinical dashboard enabling physicians to inspect individual patient readmission risks, view feature importance breakdowns, review AI-assisted clinical insights, and simulate parameter adjustments.

| File | What it does |
|---|---|
| `frontend/src/app/risk/page.tsx` | Dedicated patient risk prediction dashboard with patient selector, cohort presets, what-if simulator toggle, and responsive layout |
| `frontend/src/components/charts/RiskGauge.tsx` | Custom SVG radial arc gauge visualizing risk scores (0–100%) with dynamic color-coded risk tiers (Low, Moderate, High, Critical) |
| `frontend/src/components/risk/RiskScoreCard.tsx` | Summary card presenting readmission probability, risk level badge, confidence score, primary risk factors, and baseline metrics |
| `frontend/src/components/risk/RiskFactorBreakdown.tsx` | SHAP-inspired feature impact bars displaying positive and negative risk contributors (e.g., prior inpatient stays, HbA1c, diagnoses count) |
| `frontend/src/components/risk/ClinicalInsightsPanel.tsx` | AI-assisted recommendations, clinical rationale, actionable mitigating interventions, and discharge planning flags |
| `frontend/src/services/mockPredictionData.ts` | Structured clinical demo presets and simulated patient risk assessments with feature contributions |
| `frontend/src/services/predictionService.ts` | Data service layer managing risk assessment fetching, what-if calculation logic, and prepared for future `/risk/predict` backend integration |
| `frontend/src/types/prediction.ts` | Strong TypeScript contracts for risk levels, feature impacts, clinical insights, and simulation payloads |

**Key Risk Prediction Features:**
- **Patient Risk Score Visualization:** Visualizes normalized risk probability with clear status indicators.
- **Custom SVG Risk Gauge:** Smooth radial arc gauge with distinct visual zones (<30% Green, 30–59% Amber, 60–79% Orange, ≥80% Red).
- **Risk Factor Breakdown:** Visual impact bars quantifying how specific clinical features (prior admissions, medication count, lab procedures) push risk upward or downward.
- **Clinical Insights & Interventions:** Actionable clinical suggestions (e.g., pharmacist medication reconciliation, 48-hour post-discharge follow-up).
- **Interactive "What-If" Risk Simulator:** Clinicians can adjust patient stay length, medication count, lab procedures, emergency encounters, and medication changes to see real-time recalculations of risk scores.
- **Simulated ML Transparency:** Prominent banners and disclaimer badges identifying all prediction values as simulated demo data.
- **Service Integration Readiness:** Service layer structured to switch seamlessly from mock data to the backend `POST /risk/predict` API endpoint.

---

### 2. Readmission Forecasting UI (`/forecast`)

A hospital analytics dashboard for administrators and clinical researchers to explore historical readmission trends and project future readmission volume across multiple time horizons and departmental scopes.

| File | What it does |
|---|---|
| `frontend/src/app/forecast/page.tsx` | Forecasting dashboard with multi-horizon toggles, scope selectors, KPI cards, trend charts, and department comparisons |
| `frontend/src/components/charts/ReadmissionTrendChart.tsx` | Responsive time-series chart contrasting historical readmission rates with future projections and a shaded 95% confidence interval band |
| `frontend/src/components/charts/DepartmentForecastChart.tsx` | Cross-department comparative forecast bar chart (Cardiology, Endocrinology, General Medicine, Nephrology, Pulmonology) |
| `frontend/src/services/mockForecastData.ts` | De-identified historical trend generator and multi-horizon projection datasets with confidence intervals |
| `frontend/src/services/forecastService.ts` | Typed data service handling forecast queries, horizon filtering, and prepared for future `/api/v1/risk/forecast` backend integration |
| `frontend/src/types/forecast.ts` | TypeScript interfaces for forecast horizons, scopes, department metrics, trend points, and confidence bands |

**Key Forecasting Features:**
- **Multi-Horizon Projections:** Supports 30-day, 60-day, 90-day, 6-month, and 1-year forecasting windows.
- **Hospital & Department Scoping:** Switch between facility-wide aggregation and individual departmental views.
- **Historical vs. Projected Trend Visualization:** Line chart with distinct styling for actual past rates versus predicted trajectories.
- **95% Confidence Interval Band:** Shaded uncertainty envelope around future projections reflecting forecast variability over time.
- **Department Comparison Chart:** Comparative bar breakdown highlighting department-level readmission risk and volume.
- **Forecast KPI Summary Cards:** Instant visibility into Projected Readmission Rate, Expected Readmission Volume, High-Risk Inflow, and Estimated Beds Required.
- **Clinical Forecast Insights:** Administrative recommendations regarding seasonal surge risks, staffing allocations, and post-discharge protocols.
- **Explicit Demo Data Labeling:** Clear visual disclaimers indicating all trend projections are simulated for interface evaluation.
- **Service Integration Readiness:** Typed service functions ready to connect to `/api/v1/risk/forecast`.

---

### 3. Navigation & Role-Based Access Integration

- **`frontend/src/components/layout/Navigation.tsx`**:
  - Added `/risk` (Risk Predictions) to the Doctor role navigation.
  - Added `/forecast` (Hospital Analytics / Readmission Trends) to Hospital Administrator and Healthcare Researcher navigation matrices.
  - Preserved existing M1 role-based access control, route protection guards, and unauthenticated redirects to `/login`.

---

### 4. Shared UI Components & Types

- **`frontend/src/components/ui/Icons.tsx`**: Added SVG icons for simulation sliders, info tooltips, trend indicators (`SlidersIcon`, `InfoIcon`, `TrendingUpIcon`, `TrendingDownIcon`, `CircleIcon`, `CheckCircle2Icon`).
- **`frontend/src/types/index.ts`**: Re-exported prediction and forecast type definitions across the application.

---

## How to run it

```bash
git clone <repo-url>
cd HealthForecastAI
git checkout intern/20-kiruthika-b

# Navigate to frontend and start the development server
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Demo Accounts & Navigation

Sign in with any of the demo accounts to test role-specific workflows:

| Email | Role | Accessible Milestone 2 Routes |
|---|---|---|
| `doctor@hospital.example` | Doctor | `/risk` (Risk Predictions), `/dashboard`, `/patients` |
| `admin@hospital.example` | Hospital Administrator | `/forecast` (Hospital Analytics / Forecast), `/dashboard` |
| `researcher@hospital.example` | Healthcare Researcher | `/forecast` (Readmission Trends), `/patients` |
| `sysadmin@hospital.example` | System Administrator | Full navigation access |

### Verification Commands

Run the following commands in `frontend/` to verify code quality and build integrity:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Evidence

### 1. Code Quality & Build Checks

- **`npm run typecheck`** — Passed with 0 errors
- **`npm run lint`** — Passed with 0 warnings/errors
- **`npm run build`** — Passed successfully

**Production build output:**
```text
Next.js 15.5.23
✓ Compiled successfully in 15.3s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (10/10)
✓ Finalizing page optimization
✓ Collecting build traces

Route (app)                                 Size  First Load JS
┌ ○ /                                      269 B         120 kB
├ ○ /_not-found                            123 B         103 kB
├ ○ /dashboard                           3.21 kB         127 kB
├ ○ /forecast                             132 kB         251 kB
├ ○ /login                               4.34 kB         120 kB
├ ○ /patients                            2.37 kB         126 kB
├ ƒ /patients/[id]                       7.48 kB         127 kB
├ ○ /register                            4.86 kB         113 kB
└ ○ /risk                                12.8 kB         132 kB
+ First Load JS shared by all             103 kB
  ├ chunks/255-87552e6e05b8e3aa.js       46.4 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  └ other shared chunks (total)             2 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### 2. Route Verification

All 10 application routes compiled and generated without errors, including the newly introduced Milestone 2 routes:

| Route | Description | Status |
|---|---|:---:|
| `/risk` | Patient Risk Prediction Dashboard & What-If Simulator | Compiled / Verified |
| `/forecast` | Readmission Forecasting & Multi-Horizon Analytics | Compiled / Verified |
| `/dashboard` | Role-aware clinical overview dashboard | Compiled / Verified |
| `/patients` | Patient directory with multi-filter controls | Compiled / Verified |
| `/patients/[id]` | Patient clinical dossier and admission history | Compiled / Verified |
| `/login` | Practitioner authentication page | Compiled / Verified |
| `/register` | User registration page | Compiled / Verified |
| `/` | Platform landing page | Compiled / Verified |

---

## Metrics

Because this Milestone 2 implementation is **FRONTEND/UI ONLY** and utilizes simulated/mock datasets for UI prototyping:

- **Model Performance Metrics (Accuracy, Precision, Recall, F1 score, ROC-AUC):**
  - **Status:** Pending actual backend ML model training, offline validation on the Diabetes 130-US Hospitals dataset, and live inference API integration.
  - No synthetic or fabricated model performance values are reported.
- **Frontend Quality & Readiness Metrics:**
  - The current UI demonstrates visualization completeness, layout responsiveness, clinical safety disclaimer compliance, and typed service contract preparation ready for backend handoff.

| Metric | Value | Status |
|---|---|:---:|
| Application routes | 10 (including `/risk` and `/forecast`) | Verified |
| TypeScript errors | 0 (`npm run typecheck`) | Passed |
| ESLint errors / warnings | 0 (`npm run lint`) | Passed |
| Production build status | Success (`next build`, Next.js 15.5.23) | Passed |
| Static pages generated | 10 / 10 | Generated |
| Model Accuracy / Precision / Recall / F1 / ROC-AUC | _Pending backend/ML integration_ | N/A (Frontend Only) |

---

## Known gaps

- **Real backend / ML prediction API integration pending:** The frontend uses simulated prediction data and what-if calculation formulas; the service layer is structured to connect to the FastAPI `/risk/predict` endpoint once backend models are deployed.
- **Real forecasting API integration pending:** Time-series projections currently use mock datasets; connection to the backend `/api/v1/risk/forecast` endpoint is scheduled for subsequent milestones.
- **Real trained-model evaluation metrics pending:** Actual model training, hyperparameter tuning, and statistical performance benchmarking (Accuracy, Precision, Recall, F1, ROC-AUC) on the Diabetes 130-US Hospitals dataset will be completed in the ML track.
- **Simulated / mock data scope:** All current risk scores, feature impact weights, and readmission projections are simulated for interface prototyping and clinical workflow validation.
- **Authentication migration:** Role-based access control and session state remain preserved via client-side session storage; migration to secure backend HttpOnly cookie authentication is pending.
