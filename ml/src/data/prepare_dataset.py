"""Prepare the Diabetes 130-US Hospitals dataset for modelling.

Usage:
    python -m src.data.prepare_dataset --config configs/config.yaml
"""

import argparse
from pathlib import Path

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.features.build_features import add_utilisation_features
from src.utils.config import load_config


def main() -> None:
    """Load, clean and persist the modelling dataset."""
    parser = argparse.ArgumentParser(description="Prepare the HealthForecastAI modelling dataset")
    parser.add_argument(
        "--config",
        default=None,
        help="Path to config.yaml",
    )
    args = parser.parse_args()

    config = load_config(args.config)
    dataset = config["dataset"]

    raw_path = Path(dataset["raw_path"])
    processed_path = Path(dataset["processed_path"])
    target_column = dataset["target_column"]

    print(f"Loading raw dataset: {raw_path}")

    frame = load_raw(raw_path)

    raw_rows, raw_columns = frame.shape
    raw_duplicates = int(frame.duplicated().sum())
    raw_missing = int(frame.isna().sum().sum())

    print(f"Raw rows: {raw_rows:,}")
    print(f"Raw columns: {raw_columns}")
    print(f"Raw duplicate rows: {raw_duplicates:,}")
    print(f"Raw missing values: {raw_missing:,}")

    cleaned = basic_clean(frame, config)
    cleaned = add_utilisation_features(cleaned)

    if target_column not in cleaned.columns:
        raise ValueError(f"Target column '{target_column}' not found after preprocessing.")

    cleaned[target_column] = binarise_target(
        cleaned[target_column],
        dataset["positive_label"],
    )

    processed_rows, processed_columns = cleaned.shape
    processed_duplicates = int(cleaned.duplicated().sum())
    processed_missing = int(cleaned.isna().sum().sum())
    positive_count = int(cleaned[target_column].sum())
    negative_count = int(processed_rows - positive_count)

    processed_path.parent.mkdir(parents=True, exist_ok=True)
    cleaned.to_parquet(processed_path, index=False)

    print()
    print("Preprocessing complete")
    print("----------------------")
    print(f"Processed rows: {processed_rows:,}")
    print(f"Processed columns: {processed_columns}")
    print(f"Processed duplicate rows: {processed_duplicates:,}")
    print(f"Remaining missing values: {processed_missing:,}")
    print(f"30-day readmissions: {positive_count:,}")
    print(f"Other outcomes: {negative_count:,}")
    print(f"Output: {processed_path}")


if __name__ == "__main__":
    main()
