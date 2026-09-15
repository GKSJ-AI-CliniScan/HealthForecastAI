"""XGBoost classifier training module."""

from __future__ import annotations

import numpy as np
import xgboost as xgb


def train_xgboost(
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_estimators: int = 150,
    max_depth: int = 6,
    learning_rate: float = 0.08,
    random_state: int = 42,
) -> xgb.XGBClassifier:
    """Train an XGBoost classifier with clinical scale_pos_weight calibration."""
    # Compute scale_pos_weight to address class imbalance (~1:8 for 30-day readmissions)
    num_neg = (y_train == 0).sum()
    num_pos = (y_train == 1).sum()
    scale_pos = float(num_neg / max(1, num_pos))

    model = xgb.XGBClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        scale_pos_weight=scale_pos,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    return model
