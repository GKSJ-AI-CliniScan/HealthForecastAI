import { RiskCategory } from './auth';

export type RiskFactorImpact = 'increase' | 'decrease';

export type RiskFactorCategory =
  | 'clinical'
  | 'demographic'
  | 'medication'
  | 'history'
  | 'utilization';

export interface RiskFactor {
  id: string;
  factorName: string;
  category: RiskFactorCategory;
  impact: RiskFactorImpact;
  weightPercent: number; // e.g. 24 (%)
  description: string;
  patientValue: string | number;
  benchmarkRange?: string;
}

export type ClinicalInsightPriority = 'critical' | 'high' | 'medium' | 'low';

export type ClinicalInsightCategory =
  | 'medication_reconciliation'
  | 'followup_care'
  | 'monitoring'
  | 'lifestyle'
  | 'specialist_referral';

export interface ClinicalInsight {
  id: string;
  title: string;
  category: ClinicalInsightCategory;
  priority: ClinicalInsightPriority;
  recommendation: string;
  rationale: string;
  suggestedTimeframe?: string;
  isCompleted?: boolean;
}

export interface ModelMetadata {
  modelName: string;
  modelVersion: string;
  trainedOn: string;
  targetMetric: string;
  rocAuc?: number;
  f1Score?: number;
  accuracy?: number;
  lastEvaluated?: string;
}

export interface PatientRiskAssessment {
  patientId: number;
  patientName: string;
  mrn: string;
  ageGroup?: string;
  gender?: string;
  department?: string;
  primaryDiagnosis: string;
  readmissionProbability: number; // 0.0 to 1.0 (e.g. 0.84 = 84%)
  riskCategory: RiskCategory;
  confidenceScore: number; // 0.0 to 1.0 (e.g. 0.91 = 91%)
  predictedReadmissionHorizonDays: number; // default 30
  riskFactors: RiskFactor[];
  clinicalInsights: ClinicalInsight[];
  modelInfo: ModelMetadata;
  assessedAt: string;
  isSimulated: boolean; // Flag to indicate mock/demo prediction
  dataSource: 'simulated_mock' | 'fastapi_ml_backend';
}

export interface RiskPredictionPayload {
  patient_id: number;
  time_in_hospital: number;
  num_medications: number;
  num_lab_procedures: number;
  number_diagnoses: number;
  number_inpatient?: number;
  number_emergency?: number;
  age_group?: string;
  insulin_treatment?: string;
  change_in_meds?: boolean;
}

export interface RiskPredictionApiResponse {
  patient_id: number;
  readmission_probability: number;
  risk_category: RiskCategory;
  model_name: string;
  model_version: string;
  created_at?: string;
}
