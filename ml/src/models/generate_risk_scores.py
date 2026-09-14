import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_predict

# 1. Load data
df = pd.read_csv("diabetic_data_features.csv")
X = df.drop(columns=['risk_label'])
y = df['risk_label']

# 2. Use cross-validation to get honest, unbiased risk scores for every patient
model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
risk_scores = cross_val_predict(model, X, y, cv=5, method='predict_proba')[:, 1]

df['risk_score'] = risk_scores

# 3. Categorize into Low / Medium / High risk using percentiles
# Bottom 50% = Low, next 30% = Medium, top 20% = High
low_cutoff = df['risk_score'].quantile(0.50)
high_cutoff = df['risk_score'].quantile(0.80)

def categorize_risk(score):
    if score < low_cutoff:
        return 'Low'
    elif score < high_cutoff:
        return 'Medium'
    else:
        return 'High'

df['risk_category'] = df['risk_score'].apply(categorize_risk)

print(f"\nThresholds used -> Low/Medium: {low_cutoff:.3f}, Medium/High: {high_cutoff:.3f}")

# 4. Check distribution
print("Risk category distribution:\n", df['risk_category'].value_counts())

# 5. Save final output
output = df[['risk_score', 'risk_category']]
output.to_csv("patient_risk_scores.csv", index=False)
print("\nSaved patient_risk_scores.csv")

# 6. Show high-risk patients count
high_risk_count = (df['risk_category'] == 'High').sum()
print(f"\nHigh-risk patients identified: {high_risk_count}")