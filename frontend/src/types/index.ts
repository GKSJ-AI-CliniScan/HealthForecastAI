export type Role = 'doctor' | 'hospital_admin' | 'researcher' | 'system_admin';

export type RiskCategory = 'low' | 'medium' | 'high';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string | null;
  is_active: boolean;
}

export interface Patient {
  id: number;
  medical_record_number: string;
  age_group: string | null;
  gender: string | null;
  primary_diagnosis: string | null;
  assigned_doctor_id: number | null;
}

export interface RiskPrediction {
  patient_id: number;
  readmission_probability: number;
  risk_category: RiskCategory;
  model_name: string;
  model_version: string;
}

export interface HospitalAnalyticsSummary {
  total_patients: number;
  total_admissions: number;
  readmission_rate: number;
  average_length_of_stay: number;
  risk_distribution: Record<RiskCategory, number>;
}

export interface TreatmentEffectiveness {
  treatment_name: string;
  patients_treated: number;
  average_recovery_score: number;
  readmission_rate: number;
}

export interface OutcomeProfile {
  outcome_status: string;
  patients: number;
  average_time_in_hospital: number;
  average_number_inpatient: number;
  average_number_emergency: number;
  average_number_outpatient: number;
  average_num_medications: number;
  average_num_lab_procedures: number;
  average_num_procedures: number;
  average_number_diagnoses: number;
}