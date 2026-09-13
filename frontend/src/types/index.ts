export type Role =
  | 'doctor'
  | 'hospital_admin'
  | 'researcher'
  | 'system_admin';

export type RiskCategory =
  | 'low'
  | 'medium'
  | 'high';

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
  created_at?: string | null;
}

export interface RiskDriver {
  feature: string;
  value: string | number | null;
  contribution: number;
  direction:
  | 'increases_risk'
  | 'decreases_risk';
}

export interface ClinicalInsight {
  title: string;
  detail: string;
  severity: string;
}

export interface RiskDriversResponse {
  patient_id: number;
  probability: number;
  model_name: string;
  model_version: string;
  drivers: RiskDriver[];
  insights: ClinicalInsight[];
}

export interface ReadmissionForecast {
  scope: string;
  horizon_days: number;
  predicted_readmissions: number;
  predicted_rate: number;
}