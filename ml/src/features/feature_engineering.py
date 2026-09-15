import pandas as pd

# 1. Load cleaned data
df = pd.read_csv("diabetic_data_cleaned.csv")

# 2. Drop columns not useful for prediction
df = df.drop(columns=['encounter_id', 'patient_nbr', 'readmitted'])

# 3. Check data types and unique value counts (for our reference)
print("Checking unique values in key columns:")
for col in ['race', 'gender', 'age', 'diag_1', 'diag_2', 'diag_3',
            'admission_type_id', 'discharge_disposition_id', 'admission_source_id']:
    print(f"{col}: {df[col].nunique()} unique values")

# 4. Simplify diag_1, diag_2, diag_3
# These are ICD-9 codes with 700+ possible values - too many to one-hot encode directly.
# We group them into broader categories based on the first character/number of the code.
def simplify_diagnosis(code):
    code = str(code)
    if code.startswith('V') or code.startswith('E'):
        return 'Other'
    try:
        code_num = float(code)
        if 390 <= code_num <= 459 or code_num == 785:
            return 'Circulatory'
        elif 460 <= code_num <= 519 or code_num == 786:
            return 'Respiratory'
        elif 520 <= code_num <= 579 or code_num == 787:
            return 'Digestive'
        elif code_num == 250:
            return 'Diabetes'
        elif 800 <= code_num <= 999:
            return 'Injury'
        elif 710 <= code_num <= 739:
            return 'Musculoskeletal'
        elif 580 <= code_num <= 629 or code_num == 788:
            return 'Genitourinary'
        elif 140 <= code_num <= 239:
            return 'Neoplasms'
        else:
            return 'Other'
    except:
        return 'Other'

df['diag_1'] = df['diag_1'].apply(simplify_diagnosis)
df['diag_2'] = df['diag_2'].apply(simplify_diagnosis)
df['diag_3'] = df['diag_3'].apply(simplify_diagnosis)

print("\nSimplified diag_1 categories:\n", df['diag_1'].value_counts())

# 5. Identify all categorical (text) columns for one-hot encoding
categorical_cols = df.select_dtypes(include='object').columns.tolist()
print("\nCategorical columns to encode:", categorical_cols)

# 6. One-hot encode all categorical columns
df_encoded = pd.get_dummies(df, columns=categorical_cols, drop_first=True)

print("\nShape after encoding:", df_encoded.shape)

# 7. Save the final feature-engineered dataset
df_encoded.to_csv("diabetic_data_features.csv", index=False)
print("\nFeature-engineered data saved as diabetic_data_features.csv")