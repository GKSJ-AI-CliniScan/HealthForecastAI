-- ============================================================================
-- HealthForecast AI - Default Seed Data for Development & Review
-- Automatically executed on first database container creation.
-- ============================================================================

-- 1. Default Users (password for all accounts is 'password123')
INSERT INTO users (email, full_name, hashed_password, role, department, is_active)
VALUES 
('samarth@healthforecast.ai', 'Samarth A C', '$2b$12$KIXe8tU9qQ2pL7WjFz5nle7s9Fk1GzFmJb3B7V6J7pI8J2C1v4k9u', 'system_admin', 'Administration', TRUE),
('doctor@healthforecast.ai', 'Dr. Sarah Smith', '$2b$12$KIXe8tU9qQ2pL7WjFz5nle7s9Fk1GzFmJb3B7V6J7pI8J2C1v4k9u', 'doctor', 'Cardiology', TRUE),
('admin@hospital.org', 'Hospital Director', '$2b$12$KIXe8tU9qQ2pL7WjFz5nle7s9Fk1GzFmJb3B7V6J7pI8J2C1v4k9u', 'hospital_admin', 'Executive', TRUE),
('researcher@lab.org', 'Data Researcher', '$2b$12$KIXe8tU9qQ2pL7WjFz5nle7s9Fk1GzFmJb3B7V6J7pI8J2C1v4k9u', 'researcher', 'Analytics', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 2. Sample Patients
INSERT INTO patients (id, medical_record_number, age_group, gender, race, primary_diagnosis, assigned_doctor_id)
VALUES 
(1, 'MRN-1001', '[60-70)', 'Male', 'Caucasian', 'Diabetes', 2),
(2, 'MRN-1002', '[50-60)', 'Female', 'AfricanAmerican', 'Circulatory', 2),
(3, 'MRN-1003', '[70-80)', 'Male', 'Caucasian', 'Respiratory', 2)
ON CONFLICT (id) DO NOTHING;

-- 3. Sample Admissions
INSERT INTO admissions (id, patient_id, admission_date, discharge_date, time_in_hospital, admission_type, discharge_disposition, num_medications, num_lab_procedures, number_diagnoses, readmitted)
VALUES 
(1, 1, '2024-01-10', '2024-01-15', 5, 'Emergency', 'Discharged to home', 14, 45, 8, 'NO'),
(2, 2, '2024-02-01', '2024-02-04', 3, 'Urgent', 'Discharged to home', 10, 32, 5, 'NO'),
(3, 3, '2024-02-12', '2024-02-18', 6, 'Emergency', 'SNF', 18, 52, 9, '>30')
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Risk Predictions
INSERT INTO risk_predictions (patient_id, admission_id, readmission_probability, risk_category, model_name, model_version)
VALUES 
(1, 1, 0.0894, 'low', 'readmission_xgboost_v1', '1.0.0'),
(2, 2, 0.4250, 'medium', 'readmission_xgboost_v1', '1.0.0'),
(3, 3, 0.7820, 'high', 'readmission_xgboost_v1', '1.0.0');

-- 5. Sample Treatment Outcomes
INSERT INTO treatment_outcomes (admission_id, treatment_name, medication_change, recovery_score, length_of_stay_days, outcome)
VALUES 
(1, 'Insulin Regimen', TRUE, 85.0, 5, 'Recovered'),
(2, 'Metformin Protocol', FALSE, 78.5, 3, 'Stable'),
(3, 'Dual Agent Therapy', TRUE, 91.0, 6, 'Improved');

-- Reset sequences so new auto-increment IDs start after our seeded IDs
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('patients_id_seq', (SELECT MAX(id) FROM patients));
SELECT setval('admissions_id_seq', (SELECT MAX(id) FROM admissions));
SELECT setval('risk_predictions_id_seq', (SELECT MAX(id) FROM risk_predictions));
SELECT setval('treatment_outcomes_id_seq', (SELECT MAX(id) FROM treatment_outcomes));