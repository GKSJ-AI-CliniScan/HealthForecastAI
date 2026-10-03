# MongoDB collections

PostgreSQL holds the structured clinical record. MongoDB holds everything with a
loose or evolving shape.

## `clinical_notes`

```json
{
    "_id": "ObjectId",
    "patient_id": 1042,
    "admission_id": 88231,
    "author_role": "doctor",
    "note_type": "discharge_summary",
    "text": "...",
    "created_at": "2026-01-14T09:12:00Z"
}
```

## `model_runs`

Written by `ml/src/models/train.py` on every training run. This is the model
registry backing `GET /api/v1/models`.

```json
{
    "_id": "ObjectId",
    "run_id": "xgboost-3b1d27b045bb",
    "model_name": "readmission_xgboost",
    "algorithm": "xgboost",
    "model_version": "1.0.0",
    "trained_at": "2026-10-02T18:00:00Z",
    "dataset_hash": "sha256:...",
    "hyperparameters": {
        "max_depth": 6,
        "learning_rate": 0.05,
        "n_estimators": 100
    },
    "metrics": {
        "accuracy": 0.6868,
        "precision": 0.1454,
        "recall": 0.5099,
        "f1": 0.2263,
        "roc_auc": 0.6518
    },
    "decision_threshold": 0.1117,
    "is_active": true,
    "status": "promoted"
}
```

## `prediction_events`

One document per served prediction, for drift monitoring.

```json
{
  "_id": "ObjectId",
  "patient_id": 1042,
  "model_version": "1.0.0",
  "probability": 0.61,
  "risk_category": "medium",
  "served_at": "2026-01-14T09:12:00Z",
  "latency_ms": 42
}
```

## Rules

-   Never store a direct patient identifier (name, address, phone, exact DOB).
-   Index `patient_id` and `created_at` on every collection you add.
-   Document any new collection here before you use it.
