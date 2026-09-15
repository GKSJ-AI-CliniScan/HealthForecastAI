import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier

# 1. Load data
df = pd.read_csv("diabetic_data_features.csv")
X = df.drop(columns=['risk_label'])
y = df['risk_label']

# 2. Train final model on full data (this is the model we'll actually save/use)
model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
model.fit(X, y)

# 3. Save the trained model to a file
joblib.dump(model, "risk_model.pkl")
print("Model saved as risk_model.pkl")

# 4. Also save the list of feature columns (needed later to match input format)
feature_columns = X.columns.tolist()
joblib.dump(feature_columns, "feature_columns.pkl")
print("Feature columns saved as feature_columns.pkl")