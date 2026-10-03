# Machine Learning Model Training — HealthForecast AI

This document outlines the training protocol, class imbalance mitigation strategies, hyperparameter configurations, and serialization process for the readmission forecasting models.

---

## 1. Experimental Setup & Validation Strategy

- **Dataset Size**: 101,766 encounters.
- **Split Ratio**: 80% Training ($N = 81,412$), 20% Holdout Test ($N = 20,354$).
- **Stratification**: Preserved the positive readmission prevalence (**11.16%**) identically across training, cross-validation folds, and holdout test partitions.
- **Cross-Validation**: 5-Fold Stratified Cross-Validation on the training split for hyperparameter tuning.

---

## 2. Class Imbalance Mitigation

With an 11.16% minority class base rate, standard cross-entropy loss causes predictive models to collapse to the majority class ($y=0$), yielding deceptively high accuracy (~88.8%) but near-zero recall for patients truly requiring intervention.

To counter this:
1. **Cost-Sensitive Learning (Random Forest)**:
   - Configured `class_weight='balanced'`, which inversely weights samples by class frequencies:
     $$w_j = \frac{N}{2 \times N_j}$$
   - Penalizes misclassifying a readmitted patient ~7.96× higher than a non-readmitted encounter.
2. **Gradient Re-weighting (XGBoost)**:
   - Configured `scale_pos_weight = 7.96` to scale gradient updates corresponding to positive instances.

---

## 3. Model Architecture Configurations

### 3.1 Random Forest Classifier (Selected Production Model)
```python
RandomForestClassifier(
    n_estimators=200,
    max_depth=16,
    min_samples_split=10,
    min_samples_leaf=4,
    max_features="sqrt",
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
```
- **Rationale**: Tree ensembles handle non-linear interactions across high-cardinality clinical categories without requiring parametric distribution assumptions. Out-of-bag validation prevents overfitting.

### 3.2 XGBoost Classifier (Benchmark Model)
```python
XGBClassifier(
    n_estimators=150,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=7.96,
    eval_metric="auc",
    random_state=42,
    n_jobs=-1,
)
```

---

## 4. Training Pipeline & Model Serialization

1. Preprocessing transformations are applied to the training dataset.
2. Models are trained and cross-validated.
3. Post-training probability calibration is verified using Brier score and reliability curves.
4. Production artifacts are exported:
   - `backend/app/ml/models/saved/preprocessor_v1.joblib`
   - `backend/app/ml/models/saved/readmission_model_v1.joblib`
   - Canonical alias: `ml/models/artifacts/best_model.joblib`
