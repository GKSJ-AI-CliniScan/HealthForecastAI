# -*- coding: utf-8 -*-
"""Milestone 2 - Patient Readmission Risk Scoring

Cleaned version of the original Colab notebook export.
All notebook-only lines (!shell commands, %magics, google.colab
imports) have been removed. Environment setup (git clone, pip
install, file placement) should be handled outside this script
(e.g. in a setup.sh, README, or your CI workflow) rather than
inside the Python file itself.

Expected before running:
    - Repo cloned and current working directory set to
      HealthForecastAI/ml
    - Dependencies installed: xgboost, pyyaml, scikit-learn, joblib,
      pandas, matplotlib, seaborn
    - Raw data present at: ml/data/raw/diabetic_data.csv
    - Trained pipeline present at:
      ./ml/artifacts/readmission_model.joblib
"""

import joblib
import matplotlib.pyplot as plt
import seaborn as sns

from src.utils.config import load_config
from src.data.load_data import load_raw, binarise_target
from src.data.preprocess import basic_clean
from src.features.build_features import add_utilisation_features


def main():
    # Load config
    config = load_config("configs/config.yaml")
    print(config)
    print(config["dataset"]["raw_path"])

    # Load trained pipeline
    pipeline = joblib.load("./ml/artifacts/readmission_model.joblib")

    # Load and prepare data
    frame = load_raw("ml/data/raw/diabetic_data.csv")
    frame = basic_clean(frame, config)
    frame = add_utilisation_features(frame)

    target = binarise_target(
        frame[config["dataset"]["target_column"]],
        config["dataset"]["positive_label"],
    )
    features = frame.drop(columns=[config["dataset"]["target_column"]])
    print(features.shape)

    # Predict risk scores
    risk_scores = pipeline.predict_proba(features)[:, 1]
    results = features.copy()
    results["risk_score"] = risk_scores
    print(results.head())

    # Assign risk levels
    def assign_risk_level(score):
        if score >= 0.7:
            return "High"
        elif score >= 0.4:
            return "Medium"
        else:
            return "Low"

    results["risk_level"] = results["risk_score"].apply(assign_risk_level)
    print(results["risk_level"].value_counts())

    # Clinical recommendations
    def clinical_insight(risk_level):
        if risk_level == "High":
            return (
                "Recommend intensive follow-up within 7 days, "
                "medication review, care coordinator assigned."
            )
        elif risk_level == "Medium":
            return "Recommend standard follow-up within 14-30 days, monitor symptoms."
        else:
            return "Low risk: routine discharge instructions sufficient."

    results["clinical_recommendation"] = results["risk_level"].apply(clinical_insight)
    print(results[["risk_score", "risk_level", "clinical_recommendation"]].head(10))

    # Plot: distribution of risk scores
    plt.figure(figsize=(8, 5))
    sns.histplot(results["risk_score"], bins=30, color="#4C72B0", kde=True)
    plt.title("Distribution of Patient Risk Scores")
    plt.xlabel("Predicted Risk Score")
    plt.ylabel("Number of Patients")
    plt.show()

    # Plot: patients by risk level
    ax = (
        results["risk_level"]
        .value_counts()
        .reindex(["Low", "Medium", "High"])
        .plot(kind="bar", color=["#55A868", "#DD8452", "#C44E52"])
    )
    ax.set_title("Patients by Risk Level")
    plt.xticks(rotation=0)
    plt.show()

    return results


if __name__ == "__main__":
    main()