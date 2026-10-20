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

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  permissions: string[];
}

export interface ReadmissionForecast {
  scope: string;
  horizon_days: number;
  predicted_readmissions: number;
  predicted_rate: number;
}

export interface MonthlyReadmissions {
  month: string;
  admissions: number;
  readmission_rate: number;
}

export interface TreatmentSummary {
  treatment_name: string;
  patients_treated: number;
  average_recovery_score: number;
  readmission_rate: number;
}

export interface CareRecommendation {
  patient_id: number;
  risk_category: RiskCategory;
  readmission_probability: number;
  recommendations: string[];
  follow_up_days: number;
}
