/**
 * Clinical Decision Support Types - Milestone 3
 *
 * Aligns strictly with FastAPI backend contracts:
 * - GET /api/v1/clinical-support/recommendations/{patient_id}
 * - GET /api/v1/clinical-support/discharge-plan/{patient_id}
 */

import { RiskCategory } from './auth';

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export type RecommendationCategory =
  | 'medication'
  | 'monitoring'
  | 'follow_up'
  | 'lifestyle'
  | 'specialist_referral';

export interface CareRecommendationItem {
  id: string;
  title: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  suggested_timeframe: string;
  rationale: string;
  protocol_action: string;
  status?: 'pending' | 'accepted' | 'deferred';
}

export type RiskDriverCategory =
  | 'clinical'
  | 'pharmacological'
  | 'physiological'
  | 'utilization';

export type RiskDriverImpact = 'high' | 'medium' | 'low';

export interface RiskDriverItem {
  id: string;
  driver_name: string;
  category: RiskDriverCategory;
  impact: RiskDriverImpact;
  patient_value: string | number;
  benchmark_value: string;
  clinical_significance: string;
  contribution_percent?: number;
}

export interface DischargeCriterion {
  id: string;
  label: string;
  category:
    | 'vital_signs'
    | 'lab_stability'
    | 'mobility_adl'
    | 'medication_reconciliation'
    | 'social_support';
  is_met: boolean;
  recorded_value?: string;
  required_target?: string;
}

export interface MitigationStep {
  id: string;
  action: string;
  responsible_role: string;
  priority: 'high' | 'medium' | 'low';
  completed?: boolean;
}

export interface PatientDischargePlan {
  patient_id: number;
  ready_for_discharge: boolean | null;
  readiness_score: number; // 0-100 scale
  target_discharge_date?: string | null;
  discharge_readiness_summary: string;
  criteria: DischargeCriterion[];
  risk_mitigation: (string | MitigationStep)[];
  post_discharge_instructions: string[];
}

/** Raw backend response contract for GET /recommendations/{patient_id} */
export interface RecommendationsApiResponse {
  patient_id: number;
  recommendations: (string | CareRecommendationItem)[];
  follow_up_days: number | null;
}

/** Raw backend response contract for GET /discharge-plan/{patient_id} */
export interface DischargePlanApiResponse {
  patient_id: number;
  risk_mitigation: (string | MitigationStep)[];
  ready_for_discharge: boolean | null;
}

/** Clinician Decision Support Dossier */
export interface PatientClinicalSupportSummary {
  patient_id: number;
  patient_name: string;
  medical_record_number: string;
  age_group?: string | null;
  gender?: string | null;
  department?: string | null;
  primary_diagnosis: string;
  admission_status: 'admitted' | 'discharged' | 'under_observation';
  risk_category: RiskCategory;
  readmission_probability: number;
  follow_up_days: number | null;
  recommendations: CareRecommendationItem[];
  risk_drivers: RiskDriverItem[];
  discharge_plan: PatientDischargePlan;
  isSimulated: boolean;
  dataSource: 'simulated_mock' | 'fastapi_ml_backend';
  generated_at: string;
}
