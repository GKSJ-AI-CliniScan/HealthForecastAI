# Diabetes 130-US Hospitals Import

Milestone 1 requires the Diabetes 130-US Hospitals dataset to be loaded without committing the source data to this repository.

## Source and placement

Download `diabetic_data.csv` from the [UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/296/diabetes+130+us+hospitals+for+years+1999-2008). Place the file at `backend/data/diabetic_data.csv`. The `backend/data/` directory and CSV files are ignored by git.

## Import

```bash
cd backend
node utils/importDiabetesDataset.js data/diabetic_data.csv
```

The importer connects using `MONGO_URI`, validates the required source columns, maps encounter fields into the existing `Encounter` model, and upserts records by `encounter_id`. It reports a clear error for a missing file, malformed header, or unavailable MongoDB connection.

Required columns:

`encounter_id`, `patient_nbr`, `admission_type_id`, `time_in_hospital`, `num_lab_procedures`, `num_medications`, `number_diagnoses`, `diag_1`, `A1Cresult`, `insulin`, `readmitted`

The repository's demo seeder remains separate and continues to provide the ten synthetic clinical worksheets used by the application demo. The downloaded UCI source is not copied into source control.
