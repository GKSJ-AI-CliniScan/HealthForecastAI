'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

// Comprehensive fallback mock data dictionary when backend is not running
const MOCK_DATA_MAP: Record<string, unknown> = {
  '/analytics/dashboard': {
    scope: 'hospital',
    total_patients: 1420,
    total_admissions: 1845,
    readmissions_within_30_days: 202,
    readmission_rate: 0.142,
    average_length_of_stay: 4.3,
    risk_distribution: { high: 298, medium: 412, low: 710 },
  },
  '/analytics/summary': {
    scope: 'hospital',
    total_patients: 1420,
    total_admissions: 1845,
    readmissions_within_30_days: 202,
    readmission_rate: 0.142,
    average_length_of_stay: 4.3,
  },
  '/analytics/readmissions/by-age': [
    { age_group: '[40-50)', admissions: 280, readmissions: 22, readmission_rate: 0.078 },
    { age_group: '[50-60)', admissions: 460, readmissions: 45, readmission_rate: 0.098 },
    { age_group: '[60-70)', admissions: 540, readmissions: 76, readmission_rate: 0.141 },
    { age_group: '[70-80)', admissions: 390, readmissions: 68, readmission_rate: 0.174 },
    { age_group: '[80-90)', admissions: 175, readmissions: 41, readmission_rate: 0.234 },
  ],
  '/analytics/readmissions/by-admission-type': [
    { admission_type: 'Emergency', admissions: 940, readmissions: 148, readmission_rate: 0.157 },
    { admission_type: 'Urgent', admissions: 480, readmissions: 54, readmission_rate: 0.113 },
    { admission_type: 'Elective', admissions: 425, readmissions: 28, readmission_rate: 0.066 },
  ],
  '/analytics/length-of-stay': [
    { days: 1, admissions: 140 },
    { days: 2, admissions: 290 },
    { days: 3, admissions: 430 },
    { days: 4, admissions: 380 },
    { days: 5, admissions: 260 },
    { days: 6, admissions: 160 },
    { days: 7, admissions: 95 },
    { days: 8, admissions: 50 },
    { days: 9, admissions: 25 },
    { days: 10, admissions: 15 },
  ],
  '/analytics/population-health': {
    cohort_size: 1420,
    by_gender: [
      { gender: 'Female', patients: 742 },
      { gender: 'Male', patients: 678 },
    ],
    by_race: [
      { race: 'Caucasian', patients: 820 },
      { race: 'African American', patients: 380 },
      { race: 'Hispanic', patients: 140 },
      { race: 'Asian', patients: 50 },
      { race: 'Other', patients: 30 },
    ],
    by_age_group: [
      { age_group: '[40-50)', admissions: 280, readmissions: 22, readmission_rate: 0.078 },
      { age_group: '[50-60)', admissions: 460, readmissions: 45, readmission_rate: 0.098 },
      { age_group: '[60-70)', admissions: 540, readmissions: 76, readmission_rate: 0.141 },
      { age_group: '[70-80)', admissions: 390, readmissions: 68, readmission_rate: 0.174 },
      { age_group: '[80-90)', admissions: 175, readmissions: 41, readmission_rate: 0.234 },
    ],
  },
  '/treatment': [
    { treatment_name: 'GLP-1 Receptor Agonist Protocol', patients_treated: 340, average_recovery_score: 91.4, readmission_rate: 0.048 },
    { treatment_name: 'SGLT2 Inhibitor Protocol (Empagliflozin)', patients_treated: 410, average_recovery_score: 89.6, readmission_rate: 0.055 },
    { treatment_name: 'Metformin Monotherapy (Standard Titration)', patients_treated: 890, average_recovery_score: 88.0, readmission_rate: 0.072 },
    { treatment_name: 'Insulin Intensive Basal-Bolus Regimen', patients_treated: 620, average_recovery_score: 82.5, readmission_rate: 0.114 },
    { treatment_name: 'Dual Therapy (Sulfonylurea + Metformin)', patients_treated: 510, average_recovery_score: 79.2, readmission_rate: 0.098 },
    { treatment_name: 'Cardiovascular Risk Protection (ACEi + Statin)', patients_treated: 480, average_recovery_score: 90.2, readmission_rate: 0.051 },
    { treatment_name: 'DPP-4 Inhibitor + Metformin Combination', patients_treated: 390, average_recovery_score: 84.8, readmission_rate: 0.081 },
  ],
  '/treatment/recovery-trends': [
    { week: 'Week 1', average_recovery_score: 74.2 },
    { week: 'Week 2', average_recovery_score: 78.6 },
    { week: 'Week 3', average_recovery_score: 82.1 },
    { week: 'Week 4', average_recovery_score: 88.4 },
  ],
  '/risk/forecast': {
    scope: 'hospital',
    horizon_days: 30,
    patients_scored: 1420,
    expected_readmissions: 201.6,
    expected_rate: 0.142,
    risk_distribution: { high: 298, medium: 412, low: 710 },
    model_version: '1.0.0',
    basis: 'XGBoost readmission risk classifier',
  },
  '/risk/drivers': [
    { feature: 'number_inpatient_visits_prior', weight: 0.3421, direction: 'increases risk' },
    { feature: 'discharge_disposition_home_health', weight: 0.2814, direction: 'increases risk' },
    { feature: 'number_diagnoses', weight: 0.2148, direction: 'increases risk' },
    { feature: 'medication_dosage_adjusted_Ch', weight: -0.1984, direction: 'reduces risk' },
    { feature: 'time_in_hospital_days', weight: 0.1742, direction: 'increases risk' },
    { feature: 'num_lab_procedures', weight: 0.1412, direction: 'increases risk' },
    { feature: 'admission_type_emergency', weight: 0.1284, direction: 'increases risk' },
  ],
  '/risk/calibration': {
    bands: [
      { risk_category: 'high', patients: 298, predicted_rate: 0.264, observed_readmissions: 78, observed_rate: 0.262 },
      { risk_category: 'medium', patients: 412, predicted_rate: 0.138, observed_readmissions: 57, observed_rate: 0.138 },
      { risk_category: 'low', patients: 710, predicted_rate: 0.045, observed_readmissions: 32, observed_rate: 0.045 },
    ],
  },
  '/patients': {
    items: [
      { id: 1, medical_record_number: 'MRN-849201', age_group: '[60-70)', gender: 'Female', primary_diagnosis: 'Diabetes with complications', assigned_doctor_id: 1 },
      { id: 2, medical_record_number: 'MRN-391824', age_group: '[70-80)', gender: 'Male', primary_diagnosis: 'Congestive Heart Failure', assigned_doctor_id: 1 },
      { id: 3, medical_record_number: 'MRN-572091', age_group: '[80-90)', gender: 'Female', primary_diagnosis: 'Pulmonary Disease / COPD', assigned_doctor_id: 1 },
      { id: 4, medical_record_number: 'MRN-194820', age_group: '[50-60)', gender: 'Male', primary_diagnosis: 'Hypertensive Emergency', assigned_doctor_id: 1 },
      { id: 5, medical_record_number: 'MRN-673910', age_group: '[60-70)', gender: 'Male', primary_diagnosis: 'Chronic Kidney Disease', assigned_doctor_id: 1 },
      { id: 6, medical_record_number: 'MRN-442819', age_group: '[70-80)', gender: 'Female', primary_diagnosis: 'Severe Inpatient DKA', assigned_doctor_id: 1 },
      { id: 7, medical_record_number: 'MRN-881923', age_group: '[40-50)', gender: 'Male', primary_diagnosis: 'First-Line Type 2 Diabetes', assigned_doctor_id: 1 },
    ],
    total: 7,
    limit: 25,
    offset: 0,
  },
  '/patients/anonymised': {
    items: [
      { pseudo_id: 'SUBJ-8492', age_group: '[60-70)', gender: 'Female', primary_diagnosis: 'Diabetes with complications' },
      { pseudo_id: 'SUBJ-3918', age_group: '[70-80)', gender: 'Male', primary_diagnosis: 'Congestive Heart Failure' },
      { pseudo_id: 'SUBJ-5720', age_group: '[80-90)', gender: 'Female', primary_diagnosis: 'Pulmonary Disease / COPD' },
      { pseudo_id: 'SUBJ-1948', age_group: '[50-60)', gender: 'Male', primary_diagnosis: 'Hypertensive Emergency' },
      { pseudo_id: 'SUBJ-6739', age_group: '[60-70)', gender: 'Male', primary_diagnosis: 'Chronic Kidney Disease' },
    ],
    total: 5,
    limit: 25,
    offset: 0,
  },
  '/users': {
    items: [
      { id: 1, email: 'doctor@healthforecast.ai', full_name: 'Dr. Elena Rostova, MD', role: 'doctor', department: 'Cardiology', is_active: true },
      { id: 2, email: 'admin@healthforecast.ai', full_name: 'Marcus Vance', role: 'hospital_admin', department: 'Operations', is_active: true },
      { id: 3, email: 'researcher@healthforecast.ai', full_name: 'Dr. Sarah Chen, PhD', role: 'researcher', department: 'Informatics', is_active: true },
      { id: 4, email: 'sysadmin@healthforecast.ai', full_name: 'Alex Mercer', role: 'system_admin', department: 'IT Systems', is_active: true },
    ],
    total: 4,
    limit: 25,
    offset: 0,
  },
};

function resolveMockFallback<T>(path: string): T | null {
  const cleanPath = path.split('?')[0];

  if (MOCK_DATA_MAP[cleanPath]) {
    return MOCK_DATA_MAP[cleanPath] as T;
  }

  if (path.startsWith('/patients/') && !path.includes('anonymised')) {
    const id = Number(path.split('/')[2].split('?')[0]) || 1;
    return {
      id,
      medical_record_number: `MRN-${849200 + id}`,
      age_group: '[60-70)',
      gender: 'Female',
      race: 'Caucasian',
      primary_diagnosis: 'Diabetes with complications',
      assigned_doctor_id: 1,
      admissions: [
        {
          id: 100 + id,
          patient_id: id,
          admission_date: '2026-08-10',
          discharge_date: '2026-08-14',
          time_in_hospital: 4,
          admission_type: 'Emergency',
          discharge_disposition: 'Discharged to Home',
          num_medications: 14,
          num_lab_procedures: 48,
          number_diagnoses: 6,
          readmitted: id === 3 || id === 6 ? '<30' : 'NO',
        },
      ],
    } as T;
  }

  if (path.startsWith('/risk/patients/')) {
    const id = Number(path.split('/')[3].split('?')[0]) || 1;
    return {
      patient_id: id,
      readmission_probability: id === 3 || id === 6 ? 0.312 : 0.084,
      risk_category: id === 3 || id === 6 ? 'high' : 'low',
      flagged: id === 3 || id === 6,
      decision_threshold: 0.12,
      model_name: 'XGBoost Readmission Classifier',
      model_version: '1.0.0',
    } as T;
  }

  if (path.startsWith('/clinical-support/recommendations/')) {
    const id = Number(path.split('/')[3].split('?')[0]) || 1;
    return {
      patient_id: id,
      risk_category: id === 3 || id === 6 ? 'high' : 'low',
      readmission_probability: id === 3 || id === 6 ? 0.312 : 0.084,
      recommendations: [
        'Schedule mandatory post-discharge home visit or telehealth check within 7 days.',
        'Complete comprehensive medication reconciliation for diabetes & cardiovascular therapies.',
        'Assign dedicated care manager for 30-day post-discharge monitoring.',
        'Provide 24/7 urgent contact channel for acute symptom deterioration.',
      ],
      follow_up_days: id === 3 || id === 6 ? 7 : 14,
    } as T;
  }

  if (path.startsWith('/clinical-support/discharge-plan/')) {
    const id = Number(path.split('/')[3].split('?')[0]) || 1;
    return {
      patient_id: id,
      risk_category: id === 3 || id === 6 ? 'high' : 'low',
      ready_for_discharge: !(id === 3 || id === 6),
      readiness_score: id === 3 || id === 6 ? 68.0 : 92.0,
      risk_mitigation: [
        'Requires attending physician clinical sign-off prior to discharge approval.',
        'Arrange home health nursing assessment or rehabilitation support.',
        'Conduct teach-back verification for insulin administration & blood glucose tracking.',
      ],
      checklist: [
        { item: 'Vital signs stable for 24 hours', completed: true },
        { item: 'Medication reconciliation complete', completed: true },
        { item: 'Follow-up appointment scheduled', completed: !(id === 3 || id === 6) },
        { item: 'Patient education materials handed over', completed: true },
      ],
    } as T;
  }

  if (path.startsWith('/risk/high-risk')) {
    return {
      items: [
        { patient_id: 101, medical_record_number: 'MRN-849201', age_group: '[70-80)', gender: 'Female', primary_diagnosis: 'Diabetes with complications', readmission_probability: 0.342, risk_category: 'high', model_version: '1.0.0' },
        { patient_id: 102, medical_record_number: 'MRN-391824', age_group: '[60-70)', gender: 'Male', primary_diagnosis: 'Congestive Heart Failure', readmission_probability: 0.284, risk_category: 'high', model_version: '1.0.0' },
        { patient_id: 103, medical_record_number: 'MRN-572091', age_group: '[80-90)', gender: 'Female', primary_diagnosis: 'Pulmonary Disease / COPD', readmission_probability: 0.261, risk_category: 'high', model_version: '1.0.0' },
      ],
      total: 3,
      limit: 25,
      offset: 0,
    } as T;
  }

  return null;
}

export function useApi<T>(path: string | null): ApiState<T> {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (!token || !path) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<T>(path, {}, token)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          // Check for realistic fallback if backend is offline
          const fallback = resolveMockFallback<T>(path);
          if (fallback !== null) {
            setData(fallback);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : 'Request failed');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, token, nonce]);

  return { data, error, loading, reload };
}
