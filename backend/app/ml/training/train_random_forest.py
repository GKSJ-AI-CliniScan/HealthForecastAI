"""Random Forest classifier training module."""

from __future__ import annotations

import numpy as np
from sklearn.ensemble import RandomForestClassifier


def train_random_forest(
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_estimators: int = 150,
    max_depth: int = 12,
    random_state: int = 42,
) -> RandomForestClassifier:
    """Train a Random Forest classifier with balanced class weighting."""
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=random_state,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    return rf
