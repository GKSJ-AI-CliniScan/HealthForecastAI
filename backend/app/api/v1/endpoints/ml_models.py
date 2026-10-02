"""AI model management endpoints - Module 7 (System Administrator only)."""

from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, require_permission
from app.core.config import settings
from app.core.rbac import Permission
from app.db.mongodb import get_mongo_db
from app.services import model_service

router = APIRouter()

_manage_models = require_permission(Permission.MODEL_MANAGE)


@router.get("", summary="List registered models")
def list_models(
    user: CurrentUser = Depends(_manage_models),
) -> list[dict[str, Any]]:
    """Return the model registry from MongoDB (with metrics.json fallback)."""
    try:
        db = get_mongo_db()
        runs = list(db.model_runs.find({}, {"_id": 0}))
        if runs:
            return runs
    except Exception:
        pass

    # Fallback to local evaluation artifact
    metrics_data = model_service.get_metrics_data()
    results = metrics_data.get("results", {})
    best_model = metrics_data.get("best_model", "xgboost")

    fallback_runs: list[dict[str, Any]] = []
    for name, res in results.items():
        fallback_runs.append(
            {
                "model_name": name,
                "version": "1.0.0",
                "status": "promoted" if name == best_model else "archived",
                "accuracy": res.get("accuracy"),
                "precision": res.get("precision"),
                "recall": res.get("recall"),
                "f1": res.get("f1"),
                "roc_auc": res.get("roc_auc"),
                "decision_threshold": res.get("decision_threshold"),
            }
        )
    return fallback_runs


@router.get("/active", summary="Return the model currently serving predictions")
def active_model(
    user: CurrentUser = Depends(_manage_models),
) -> dict[str, Any]:
    """Return the active model name, artifact path, and serving metadata."""
    return {
        "name": settings.ACTIVE_RISK_MODEL,
        "artifact_dir": settings.MODEL_ARTIFACT_DIR,
        "status": "ready",
        "framework": "xgboost 2.1.3",
        "decision_threshold": 0.1117,
        "n_features": 51,
    }


@router.get("/metrics", summary="Evaluation metrics for the active model")
def model_metrics(
    user: CurrentUser = Depends(_manage_models),
) -> dict[str, float | None]:
    """Return accuracy, precision, recall, F1 and ROC-AUC for the active model."""
    metrics_data = model_service.get_metrics_data()
    results = metrics_data.get("results", {})
    best_model_name = metrics_data.get("best_model", "xgboost")
    active_results = results.get(best_model_name, {})

    return {
        "accuracy": active_results.get("accuracy"),
        "precision": active_results.get("precision"),
        "recall": active_results.get("recall"),
        "f1": active_results.get("f1"),
        "roc_auc": active_results.get("roc_auc"),
    }
