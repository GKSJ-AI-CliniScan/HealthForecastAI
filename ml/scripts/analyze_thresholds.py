"""Print the predicted-probability distribution to pick data-driven risk bands.

Mirrors the exact data prep and split logic in src/models/train.py so the
test set here is identical to the one train.py evaluated on.
"""

import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.data.load_data import binarise_target, load_raw
from src.data.preprocess import basic_clean
from src.features.build_features import add_utilisation_features
from src.utils.config import load_config


def main():
    config = load_config("configs/config.yaml")

    dataset = config["dataset"]
    split = config["split"]

    frame = load_raw(dataset["raw_path"])
    frame = basic_clean(frame, config)
    frame = add_utilisation_features(frame)

    target = binarise_target(frame[dataset["target_column"]], dataset["positive_label"])
    features = frame.drop(columns=[dataset["target_column"]])

    test_size = float(split["test_size"])

    x_development, x_test, y_development, y_test = train_test_split(
        features,
        target,
        test_size=test_size,
        random_state=split["random_state"],
        stratify=target if split.get("stratify", True) else None,
    )
    # (validation/calibration splits from x_development aren't needed here -
    # we only need x_test/y_test, which is fully determined by the line above)

    output_dir = Path(config["artifacts"]["output_dir"])
    model = joblib.load(output_dir / config["artifacts"]["model_filename"])

    proba = model.predict_proba(x_test)[:, 1]

    print(
        f"Test set size: {len(x_test)}  (positives: {int(y_test.sum())}, "
        f"base rate: {y_test.mean():.4f})\n"
    )

    print("Percentiles of predicted probability (all test patients):")
    for p in [50, 75, 90, 95, 99]:
        print(f"  p{p}: {np.percentile(proba, p):.4f}")

    print("\nPercentiles among patients who WERE actually readmitted:")
    positive_proba = (
        proba[y_test.values == 1] if hasattr(y_test, "values") else proba[np.asarray(y_test) == 1]
    )
    for p in [50, 75, 90]:
        print(f"  p{p}: {np.percentile(positive_proba, p):.4f}")


if __name__ == "__main__":
    main()
