export type Role =
  | "doctor"
  | "hospital_admin"
  | "researcher"
  | "system_admin";

export type RiskCategory =
  | "low"
  | "medium"
  | "high";

export type Permission = string;

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface Patient {
  id: number;
  medical_record_number: string;
  age_group: string | null;
  gender: string | null;
  race?: string | null;
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
  risk_factors: string[];
}

export interface ReadmissionForecast {
  scope: string;
  horizon_days: number;
  predicted_readmissions: number;
  predicted_rate: number;
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
export interface TreatmentMethodCount {
  treatment_type: string;
  patient_count: number;
}

export interface TreatmentOutcome {
  id: number;
  patient_id: number;
  treatment_type: string;
  outcome_status:
    | "improved"
    | "unchanged"
    | "worsened"
    | string;
  recovery_days: number | null;
  effectiveness_score: number | null;
  created_at: string;
}

export interface HospitalSummary {
  total_patients: number;
  total_predictions_made: number;
  average_readmission_risk: number;
}

export interface ReadmissionDistribution {
  current_distribution: {
    risk_category: string;
    count: number;
  }[];
  total_predictions_ever_run: number;
}

export interface PopulationHealth {
  total_patients: number;
  gender_distribution: Record<string, number>;
  age_distribution: Record<string, number>;
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

/* =========================================
   MODEL MANAGEMENT
   ========================================= */

export interface ActiveModel {
  model_name: string;
  model_version: string;
  artifact_path: string;
  status: string;
  filename?: string;
}

export interface ModelMetrics {
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  roc_auc: number | null;
  threshold?: number | null;
}

export interface RegisteredModel {
  filename: string;
  size_kb: number;
  is_active?: boolean;
}
