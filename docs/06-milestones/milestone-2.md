# Milestone 2 report - Week 3 & 4 - Risk Prediction & Readmission Forecasting

- **Intern name:** Raniya Raseen M M
- **Branch:** `intern/18-raniya-raseen-m-m`
- **Submitted on:** 2026-10-17

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

I built the machine-learning side of the platform: a risk model trained on the Diabetes 130-US Hospitals dataset and a small FastAPI service that serves it.

- **Training:** `ml/src/models/train_model.py` splits the feature-engineered data 80/20 (stratified, `random_state=42`) and trains a Random Forest (100 trees, `class_weight="balanced"`). It prints accuracy, precision, recall, F1, ROC-AUC and a per-class report.
- **Risk scores:** `ml/src/models/generate_risk_scores.py` uses 5-fold cross-validated probabilities, so each patient's score comes from a model that did not see that patient. It then bands patients as Low (bottom 50%), Medium (next 30%) and High (top 20%) by percentile.
- **Final model:** `ml/src/models/save_model.py` trains a smaller Random Forest (30 trees, max depth 10) on all rows and saves `risk_model.pkl` and `feature_columns.pkl` to `ml/artifacts/`. I used a smaller model to keep the deployed file small.
- **Prediction API:** `ml/src/app.py` (FastAPI). `GET /` is a health check. `POST /predict-risk` takes a JSON body `{"data": {feature: value, ...}}` and returns `risk_score` (0-1) and `risk_category` (Low below 0.48, Medium below 0.62, High otherwise). Missing features default to 0. CORS is enabled for a dashboard on `http://localhost:5500`.
- **Deployment:** the API is deployed on Render at https://healthforecastai.onrender.com (interactive docs at `/docs`).

## How to run it

The dataset is not committed (see `ml/data/README.md`). Download `diabetic_data.csv` into `ml/data/processed/` first, then from the repository root:

```bash
pip install -r ml/requirements.txt

# 1. clean, 2. build features, 3. train and print metrics
cd ml/data/processed
python ../../src/features/preprocess.py
python ../../src/features/feature_engineering.py
python ../../src/models/train_model.py

# 4. save the deployable model (writes risk_model.pkl; move it to ml/artifacts/)
cd ../../src/models
python save_model.py

# 5. run the API locally
cd ..
pip install -r requirements-deploy.txt
uvicorn app:app --reload        # then open http://localhost:8000/docs
```

## Evidence

Terminal output of `train_model.py` on the held-out 20% of the data (20,049 patients):

```
Training set size: (80195, 101)
Test set size: (20049, 101)

--- Model Performance ---
Accuracy: 0.6341
Precision: 0.6120
Recall: 0.5734
F1-score: 0.5921
ROC-AUC: 0.6821

              precision  recall  f1-score  support
           0       0.65    0.69      0.67    10764
           1       0.61    0.57      0.59     9285
```

The API is live at https://healthforecastai.onrender.com/docs, where `POST /predict-risk` can be tried from the browser.

## Metrics

All five metrics for the model I evaluated (Random Forest, 100 trees, balanced class weights), on 20,049 held-out patients, treating class 1 ("readmitted") as positive:

| Metric | Value |
|---|---|
| Accuracy | 0.634 |
| Precision | 0.612 |
| Recall | 0.573 |
| F1 | 0.592 |
| ROC-AUC | 0.682 |

I trained one model type only, so there is no model comparison. The result is modest: the model ranks patients better than chance (ROC-AUC 0.68) but is wrong for roughly 4 in 10 patients, so it is suitable for prioritising follow-up, not for making clinical decisions on its own.

## Known gaps

- **Target definition.** My label (`risk_label`) is 1 if a patient was readmitted at any time (`<30` or `>30`) and 0 if never readmitted. The project brief targets readmission within 30 days. The class balance is therefore about 46% positive, not the roughly 11% a 30-day target would give, and my metrics are not comparable with 30-day results.
- **Deployed model is not the evaluated model.** The metrics above are for the 100-tree model on a held-out split. The model served by the API is a smaller 30-tree model trained on all rows, so it has no held-out score of its own. I expect it to perform somewhat worse, but I have not measured it.
- **Possible data leakage.** The same patient can appear several times in the dataset and I split by row, not by patient, so train and test may share patients and the scores may be slightly optimistic.
- **No readmission forecasting.** I did not build a time-series forecast, a forecasting report or a clinical-insights module. Only individual risk scoring is implemented.
- **No dashboard in this repository.** There is no dashboard page committed. The API's CORS setting allows a local dashboard on port 5500, but the page itself is not part of this submission.
- **Fixed thresholds.** The Low/Medium/High cut-offs (0.48 and 0.62) are hard-coded in `app.py`. They were not tuned or calibrated against clinical outcomes.
- **Model files are committed.** `risk_model.pkl` and `feature_columns.pkl` are in `ml/artifacts/` because the Render deployment loads them, which goes against the repository's rule about model artifacts. They are small (about 3.4 MB) but should be rebuilt in CI or stored elsewhere.
- **No automated tests** for my scripts or the API.
