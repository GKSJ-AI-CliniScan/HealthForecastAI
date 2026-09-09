"""Mentor-friendly demo for different readmission risk levels."""

from src.data.load_data import load_raw
from src.models.predict import load_model, predict_frame
from src.utils.config import load_config


def main() -> None:
    """Find and display low- and high-risk model predictions."""

    # Load project configuration and dataset.
    config = load_config()
    df = load_raw(config["dataset"]["raw_path"])

    # Load the trained model pipeline.
    model = load_model(
        config["artifacts"]["output_dir"],
        config["artifacts"]["model_filename"],
    )

    # Generate predictions for the dataset.
    predictions = predict_frame(
        model,
        df,
        high=config["risk_bands"]["high"],
        medium=config["risk_bands"]["medium"],
    )

    # Find one example from each risk category.
    low = predictions[predictions["risk_category"] == "low"]
    high = predictions[predictions["risk_category"] == "high"]

    if low.empty:
        raise RuntimeError("No low-risk prediction was found.")

    if high.empty:
        raise RuntimeError("No high-risk prediction was found.")

    print("\n" + "=" * 55)
    print("       HealthForecast AI - Prediction Demo")
    print("=" * 55)

    # Display the low-risk example.
    print("\nLOW-RISK EXAMPLE")
    print("-" * 55)

    low_row = low.iloc[0]

    print(f"30-Day Readmission Probability : " f"{float(low_row['readmission_probability']):.2%}")
    print(f"Risk Category                  : {low_row['risk_category'].upper()}")
    print(f"Clinical Insight               : {low_row['clinical_insight']}")

    print("Supporting Observations:")
    for factor in low_row["supporting_factors"]:
        print(f"  - {factor}")

    # Display the high-risk example.
    print("\nHIGH-RISK EXAMPLE")
    print("-" * 55)

    high_row = high.iloc[0]

    print(f"30-Day Readmission Probability : " f"{float(high_row['readmission_probability']):.2%}")
    print(f"Risk Category                  : {high_row['risk_category'].upper()}")
    print(f"Clinical Insight               : {high_row['clinical_insight']}")

    print("Supporting Observations:")
    for factor in high_row["supporting_factors"]:
        print(f"  - {factor}")

    print("\n" + "=" * 55)
    print("Prediction demo completed successfully.")
    print("=" * 55)


if __name__ == "__main__":
    main()
