# ML Testing – HealthForecast AI (Milestone 4)

## Setup
1. Copy into `HealthForecastAI/ml/` (next to `src/`, `configs/`, `data/`, `artifacts/`):
   `tests/`, `ml_adapter.py`, `risk_logic.py`, `pytest.ini`, `generate_validation_report.py`
2. `pip install -r requirements-test.txt`
3. Check the `>>> EDIT <<<` block in `ml_adapter.py` (paths, `TEST_SIZE`/`SPLIT_SEED` must match your training split).
4. Run:
```
REQUIRE_REAL=1 pytest -v -s                 # fails loudly if it can't find your real model/data
python generate_validation_report.py        # -> validation_report/validation_report.md + plots
```
The header line of the pytest output tells you REAL or DEMO mode. Demo numbers are never valid.

## Test files
| File | What it proves |
|---|---|
| test_cleaning_milestone1.py | Cleaning: no '?', dropped columns, no expired discharges, one row/patient, first encounter kept, idempotent |
| test_data_validation.py | Dataset integrity, target labels, imbalance, missingness, train/test patient overlap |
| test_model_performance.py | Accuracy/precision/recall/F1/ROC-AUC vs thresholds, baseline, calibration, lift, overfit gap |
| test_risk_logic.py | 0.4/0.7 boundaries, invalid scores, recommendations, every band populated, observed risk rises Low→High |
| test_analytics.py | Treatment/medication tables, recovery summary, dashboard KPIs, age table, CSV report |
| test_model_robustness.py | NaNs, unseen categories, outliers, determinism, latency, save/load |
| test_fairness_subgroups.py | AUC by gender / race / age |
| test_scripts_smoke.py | Milestone2.py runs end-to-end (real mode) |
| test_api_integration.py | Optional: backend endpoint (set API_URL) |
