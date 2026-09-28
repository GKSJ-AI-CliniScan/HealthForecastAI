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
  created_at?: string;
  risk_factors: string[]
}

export interface HospitalAnalyticsSummary {
  total_patients: number;
  total_admissions: number;
  readmission_rate: number;
  average_length_of_stay: number;
  risk_distribution: Record<RiskCategory, number>;
}
 
export interface TreatmentEffectivenessSummary {
  treatment_type: string | null;
  total_cases: number;
  improved_rate: number;
  avg_recovery_days: number | null;
}

export interface RecoveryTrendPoint {
  month: string;
  avg_effectiveness: number | null;
  case_count: number;
}

export interface HospitalSummary {
  total_patients: number;
  total_predictions_made: number;
  average_readmission_risk: number;
}

export interface ReadmissionDistribution {
  current_distribution: { risk_category: string; count: number }[];
  total_predictions_ever_run: number;
}

export interface PopulationHealth {
  total_patients: number;
  gender_distribution: Record<string, number>;
}

export interface DischargePlan {
  patient_id: number;
  recommendations: string[];
  requires_close_monitoring: boolean;
}
export interface AnonymisedPatient {
  pseudo_id: string;
  age_group: string | null;
  gender: string | null;
  primary_diagnosis: string | null;
  risk_category: string;
}
export interface PopulationHealth {
  total_patients: number;
  gender_distribution: Record<string, number>;
  age_distribution: Record<string, number>;  // NEW
}