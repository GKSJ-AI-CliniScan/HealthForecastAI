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

export type PredictionType = 'risk' | 'readmission';

export interface RiskPrediction {
  id: number;
  patient_id: number;
  admission_id: number | null;
  readmission_probability: number;
  risk_category: RiskCategory;
  prediction_type: PredictionType;
  confidence_score: number | null;
  readmission_window: string | null;
  actual_readmitted: boolean | null;
  outcome_recorded_at: string | null;
  model_name: string;
  model_version: string;
  created_at: string | null;
}

export interface RecommendationItem {
  category: string;
  text: string;
}

export interface CareRecommendations {
  patient_id: number;
  risk_category: RiskCategory | null;
  based_on_prediction_id: number | null;
  recommendations: RecommendationItem[];
  follow_up_days: number | null;
}

export interface DischargePlan {
  patient_id: number;
  risk_category: RiskCategory | null;
  based_on_prediction_id: number | null;
  risk_mitigation: RecommendationItem[];
  discharge_checklist: RecommendationItem[];
  ready_for_discharge: boolean | null;
}

export interface ReadmissionForecast {
  scope: string;
  horizon_days: number;
  predicted_readmissions: number;
  predicted_rate: number;
}

export interface HospitalAnalyticsSummary {
  total_patients: number;
  total_admissions: number;
  readmission_rate: number;
  average_length_of_stay: number;
  risk_distribution: Record<RiskCategory, number>;
}
