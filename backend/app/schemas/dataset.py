"""Dataset schemas."""

from typing import Any
from pydantic import BaseModel


class DatasetSummaryResponse(BaseModel):
    """Dataset summary schema for Milestone 1 foundation."""
    dataset_name: str
    total_records: int
    total_columns: int
    column_names: list[str]
    missing_value_summary: dict[str, int]
    numeric_features_count: int
    categorical_features_count: int
    status: str
    feature_columns: list[str]
    sample_records: list[dict[str, Any]]
