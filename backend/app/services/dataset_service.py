"""Dataset Service for Milestone 1 foundation."""

import os
from pathlib import Path
import pandas as pd

from app.schemas.dataset import DatasetSummaryResponse


class DatasetService:
    """Service inspecting and reporting on the Diabetes 130-US Hospitals dataset."""

    @staticmethod
    def _find_dataset_file() -> Path | None:
        """Locate diabetic_data.csv in known repository locations."""
        candidates = [
            Path("dataset/raw/diabetic_data.csv"),
            Path("../dataset/raw/diabetic_data.csv"),
            Path("ml/data/raw/diabetic_data.csv"),
            Path("../ml/data/raw/diabetic_data.csv"),
            Path(__file__).resolve().parent.parent.parent.parent
            / "dataset"
            / "raw"
            / "diabetic_data.csv",
            Path(__file__).resolve().parent.parent.parent.parent
            / "ml"
            / "data"
            / "raw"
            / "diabetic_data.csv",
        ]
        for p in candidates:
            if p.exists() and p.is_file():
                return p
        return None

    def get_dataset_summary(self) -> DatasetSummaryResponse:
        """Inspect and summarize the raw dataset."""
        file_path = self._find_dataset_file()
        if not file_path:
            return DatasetSummaryResponse(
                dataset_name="Diabetes 130-US Hospitals (Missing)",
                total_records=0,
                total_columns=0,
                column_names=[],
                missing_value_summary={},
                numeric_features_count=0,
                categorical_features_count=0,
                status="FILE_NOT_FOUND",
                feature_columns=[],
                sample_records=[],
            )

        # Read dataset efficiently
        df = pd.read_csv(file_path, na_values=["?", "None", "Unknown/Invalid"])
        total_records, total_columns = df.shape

        missing_counts = df.isnull().sum().to_dict()
        # Filter to only columns with missing values for concise display
        missing_summary = {col: int(cnt) for col, cnt in missing_counts.items() if cnt > 0}

        numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()
        categorical_cols = df.select_dtypes(exclude=["number"]).columns.tolist()

        sample_df = df.head(5).fillna("N/A")
        sample_records = sample_df.to_dict(orient="records")

        return DatasetSummaryResponse(
            dataset_name="Diabetes 130-US Hospitals Dataset (1999-2008)",
            total_records=total_records,
            total_columns=total_columns,
            column_names=df.columns.tolist(),
            missing_value_summary=missing_summary,
            numeric_features_count=len(numeric_cols),
            categorical_features_count=len(categorical_cols),
            status="LOADED_AND_VALIDATED",
            feature_columns=df.columns.tolist(),
            sample_records=sample_records,
        )
