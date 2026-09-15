import pandas as pd

# 1. Load data
df = pd.read_csv("diabetic_data.csv")
print("Original shape:", df.shape)

# 2. Replace '?' with actual missing values (NaN)
df = df.replace('?', pd.NA)

# 3. Check missing value percentage per column
missing_pct = (df.isna().sum() / len(df)) * 100
print("\nMissing % per column:\n", missing_pct[missing_pct > 0].sort_values(ascending=False))

# 4. Drop columns with too much missing data (mostly unusable)
cols_to_drop = ['weight', 'max_glu_serum', 'A1Cresult', 'medical_specialty', 'payer_code']
df = df.drop(columns=cols_to_drop)

# 5. Fill 'race' missing values with 'Unknown' (only ~2% missing, worth keeping)
df['race'] = df['race'].fillna('Unknown')

# 6. Drop rows where diag_1, diag_2, or diag_3 are missing (very small % of data)
df = df.dropna(subset=['diag_1', 'diag_2', 'diag_3'])

# 7. Create the binary risk label from 'readmitted'
# 1 = readmitted at some point (<30 or >30), 0 = never readmitted
df['risk_label'] = df['readmitted'].apply(lambda x: 0 if x == 'NO' else 1)

# 8. Check final shape and risk label balance
print("\nShape after cleaning:", df.shape)
print("\nRisk label counts:\n", df['risk_label'].value_counts())

# 9. Save cleaned data for the next step
df.to_csv("diabetic_data_cleaned.csv", index=False)
print("\nCleaned data saved as diabetic_data_cleaned.csv")