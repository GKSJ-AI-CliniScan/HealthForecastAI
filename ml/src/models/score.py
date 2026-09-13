"""Batch scoring for the readmission risk model."""

import argparse
from pathlib import Path

import pandas as pd

from src.data.preprocess import basic_clean
from src.features.build_features import add_utilisation_features
from src.models.predict import load_model, predict_frame


def prepare_for_inference(
    frame: pd.DataFrame,
    config: dict,
) -> pd.DataFrame:
    """Apply the same feature preparation used during training."""
    prepared = basic_clean(frame, config)
    prepared = add_utilisation_features(prepared)
    return prepared


def score_file(
    input_path: str | Path,
    output_path: str | Path,
    artifact_dir: str | Path,
    config: dict,
    high_threshold: float = 0.70,
    medium_threshold: float = 0.40,
) -> pd.DataFrame:
    """Load records, prepare features, score them, and save predictions."""
    input_path = Path(input_path)
    output_path = Path(output_path)

    frame = pd.read_csv(input_path)

    prepared = prepare_for_inference(
        frame,
        config,
    )

    model = load_model(artifact_dir)

    scored = predict_frame(
        model=model,
        frame=prepared,
        high=high_threshold,
        medium=medium_threshold,
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    scored.to_csv(output_path, index=False)

    return scored


def main() -> None:
    """Run batch scoring from the command line."""
    parser = argparse.ArgumentParser(description="Score patient records with the readmission model")

    parser.add_argument(
        "--input",
        required=True,
        help="Input CSV containing patient/admission records",
    )

    parser.add_argument(
        "--output",
        required=True,
        help="Output CSV for scored records",
    )

    parser.add_argument(
        "--artifact-dir",
        default="ml/artifacts",
        help="Directory containing the trained model",
    )

    parser.add_argument(
        "--config",
        default="ml/configs/config.yaml",
        help="Path to the ML configuration",
    )

    parser.add_argument(
        "--high-threshold",
        type=float,
        default=0.70,
        help="Probability threshold for high risk",
    )

    parser.add_argument(
        "--medium-threshold",
        type=float,
        default=0.40,
        help="Probability threshold for medium risk",
    )

    args = parser.parse_args()

    import yaml

    with open(args.config, encoding="utf-8") as config_file:
        config = yaml.safe_load(config_file)

    scored = score_file(
        input_path=args.input,
        output_path=args.output,
        artifact_dir=args.artifact_dir,
        config=config,
        high_threshold=args.high_threshold,
        medium_threshold=args.medium_threshold,
    )

    print(f"Scored {len(scored)} records")

    print("\nRisk distribution:")
    print(scored["risk_category"].value_counts().to_string())

    print("\nPredictions:")
    print(scored[["readmission_probability", "risk_category"]].to_string(index=False))


if __name__ == "__main__":
    main()
