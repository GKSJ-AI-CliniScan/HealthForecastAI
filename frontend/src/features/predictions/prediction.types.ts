export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ContributingFactor {
  factor: string;
  detail: string;
  impact: 'HIGH' | 'MODERATE' | 'LOW';
  direction: 'INCREASES_RISK' | 'DECREASES_RISK' | 'NEUTRAL';
}

export interface Prediction {
  id: string;
  patient_id: string;
  prediction_type: string;
  risk_score: number;
  risk_category: RiskCategory;
  readmission_probability: number;
  confidence_score: number;
  contributing_factors: ContributingFactor[];
  clinical_insights?: string;
  model_name: string;
  model_version: string;
  created_at: string;
  patient_identifier?: string;
  patient_name?: string;
}

export interface PredictionListResponse {
  items: Prediction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface HighRiskPatient {
  patient_id: string;
  patient_identifier: string;
  patient_name: string;
  gender?: string;
  risk_score: number;
  risk_category: RiskCategory;
  readmission_probability: number;
  latest_prediction_date: string;
  assigned_doctor_name?: string | null;
  prediction_id: string;
}

export interface HighRiskPatientListResponse {
  items: HighRiskPatient[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RiskDistributionItem {
  category: RiskCategory;
  count: number;
  percentage: number;
}

export interface RiskDistributionResponse {
  total_predictions: number;
  distribution: RiskDistributionItem[];
}

export interface TrendPoint {
  date: string;
  average_probability: number;
  prediction_count: number;
  high_risk_count: number;
}

export interface ReadmissionTrendsResponse {
  trends: TrendPoint[];
}

export interface PredictionSummaryResponse {
  total_predictions: number;
  high_risk_patients: number;
  critical_patients: number;
  average_readmission_probability: number;
  active_model: string;
  active_version: string;
}

export interface GeneratePredictionPayload {
  patient_id: string;
  override_features?: Record<string, any>;
}
