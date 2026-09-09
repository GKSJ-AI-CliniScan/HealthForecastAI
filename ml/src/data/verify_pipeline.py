"""Verify the complete data preparation pipeline."""

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.features.build_features import add_utilisation_features
from src.utils.config import load_config


def main() -> None:
    """Run and verify loading, preprocessing, and feature engineering."""

    dataset_path = "data/raw/diabetic_data.csv"
    config_path = "configs/config.yaml"

    # 1. Load the raw dataset.
    df = load_raw(dataset_path)

    print("1. DATA LOADING")
    print("Rows:", len(df))
    print("Columns:", len(df.columns))
    print("Target classes:")
    print(df["readmitted"].value_counts())

    # 2. Apply the configured cleaning steps.
    config = load_config(config_path)
    clean = basic_clean(df, config)

    print("\n2. DATA PREPROCESSING")
    print("Original shape:", df.shape)
    print("Processed shape:", clean.shape)
    print("Duplicates:", clean.duplicated().sum())
    print("Target preserved:", "readmitted" in clean.columns)

    # 3. Apply the existing feature engineering.
    features = add_utilisation_features(clean)

    engineered_features = [
        "prior_visits_total",
        "prior_acute_visits",
        "any_prior_visit",
        "medication_change_flag",
        "diabetes_medication_flag",
    ]

    print("\n3. FEATURE ENGINEERING")

    for feature in engineered_features:
        print(f"{feature}:", feature in features.columns)

    # Display sample engineered feature values.
    print("\nSample engineered features:")

    available_features = [feature for feature in engineered_features if feature in features.columns]

    print(features[available_features].head().to_string(index=False))

    # 4. Convert the target to the binary readmission flag.
    target = binarise_target(
        features["readmitted"],
        config["dataset"]["positive_label"],
    )

    print("\n4. TARGET CONVERSION")
    print(
        "Positive class (<30) = 1:",
        int(target.sum()),
    )
    print(
        "Negative class (>30 + NO) = 0:",
        int((target == 0).sum()),
    )

    # Verify that every expected feature exists.
    all_features_created = all(feature in features.columns for feature in engineered_features)

    # Verify that both target classes are present.
    target_counts_correct = (
        len(target) == len(features) and target.sum() > 0 and (target == 0).sum() > 0
    )

    if all_features_created and target_counts_correct:
        print("\nPIPELINE VERIFICATION SUCCESSFUL")
    else:
        print("\nPIPELINE VERIFICATION FAILED")


if __name__ == "__main__":
    main()
