# Milestone 4 report - Week 7 & 8 - Testing, Deployment & Documentation

- **Intern name:** Raniya Raseen M M
- **Branch:** `intern/18-raniya-raseen-m-m`
- **Submitted on:** 2026-10-20

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

- **Tests:** 46 backend tests in `backend/tests/` covering the access matrix, JWT and password handling, login and user creation, patient scoping and anonymisation, risk scoring, forecasting, clinical support, analytics and the model endpoints. The tests include wrong-role and unauthenticated cases for the main endpoints. The ML package has its own tests in `ml/tests/`.
- **Model validation:** the Random Forest is evaluated on a stratified held-out 20% (see `milestone-2.md`), and `GET /models/metrics` exposes the five scores to the system administrator.
- **Code quality:** the ML code was fixed to pass `ruff` and `black`; the backend passes both as well.
- **Deployment:** the ML prediction API is deployed on Render at https://healthforecastai.onrender.com (docs at `/docs`). The platform's `docker-compose.yml`, Dockerfiles and CI workflows come from the starter and are used unchanged.
- **Documentation:** the four milestone reports in this folder, and the starter's architecture, API and RBAC documents.

## How to run it

```bash
git clone https://github.com/GKSJ-AI-CliniScan/HealthForecastAI
cd HealthForecastAI
git checkout intern/18-raniya-raseen-m-m

# run the tests
cd backend && pip install -r requirements.txt -r requirements-dev.txt && pytest
cd ../ml && pip install -r requirements.txt -r requirements-dev.txt && pytest
cd ../frontend && npm install && npm run lint && npm run typecheck && npm run build

# run everything together
cd .. && cp .env.example .env && docker compose up --build
```

## Evidence

- Live ML API: https://healthforecastai.onrender.com/docs (the `POST /predict-risk` endpoint can be tried from the browser).
- The GitHub Actions run on this branch shows the lint, test and build results for the backend, frontend and ML pipeline.
- Held-out model scores are in `milestone-2.md`.

## Metrics

- Backend tests written: 46. ML tests: see `ml/tests/`.
- Model: accuracy 0.634, precision 0.612, recall 0.573, F1 0.592, ROC-AUC 0.682 (held-out, 20,049 patients).
- Backend test coverage, prediction response time and dashboard load time: not measured.

## Known gaps

- **The platform backend and dashboard are not deployed.** Only the ML API is live. I have not run `docker compose up`, so the Docker setup is untested by me.
- **No end-to-end demonstration** of the full platform was done, and there is no presentation deck.
- **The backend tests and the frontend build were not run on my machine** before submission. If CI shows a failure on this branch, that is an open defect.
- **No performance or load testing.** Dashboard responsiveness was not measured or optimised.
- **No clinical validation.** The model has modest discrimination (ROC-AUC 0.68), the label is any readmission rather than 30-day readmission, and the evaluation splits by row, not by patient. It must not be used for clinical decisions.
- **Data is in memory and synthetic** in the platform backend (see `milestone-1.md` and `milestone-3.md`); there is no database, backups or audit persistence.
- **Production hardening is not done:** a real `SECRET_KEY`, restricted CORS, TLS, refresh tokens, rate limiting.
