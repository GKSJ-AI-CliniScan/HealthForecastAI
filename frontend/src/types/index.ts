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

// ---------------------------------------------------------------------------
// Admissions & treatment outcomes (backend/app/schemas/admission.py, treatment.py)
// ---------------------------------------------------------------------------

export interface Admission {
  id: number;
  patient_id: number;
  admission_date: string | null;
  discharge_date: string | null;
  time_in_hospital: number | null;
  admission_type: string | null;
  discharge_disposition: string | null;
  num_medications: number | null;
  num_lab_procedures: number | null;
  number_diagnoses: number | null;
  readmitted: string | null;
  department: string | null;
}

export interface ReadmissionSummary {
  patient_id: number;
  total_admissions: number;
  readmitted_total: number;
  by_label: Record<string, number>;
}

export type TreatmentOutcomeValue = 'improved' | 'unchanged' | 'worsened' | 'unknown';

export interface TreatmentOutcome {
  id: number;
  admission_id: number;
  treatment_name: string;
  medication_change: boolean | null;
  recovery_score: number | null;
  length_of_stay_days: number | null;
  outcome: TreatmentOutcomeValue | null;
}

export interface TreatmentRateSummary {
  treatment_name: string;
  sample_size: number;
  average_recovery_score: number | null;
  success_rate: number;
}

/** Keys are every TreatmentOutcomeValue plus "unrecorded". */
export interface TreatmentOutcomeDistribution {
  treatment_name: string;
  sample_size: number;
  outcomes: Record<string, number>;
}

export interface DepartmentEffectiveness {
  department: string;
  sample_size: number;
  average_recovery_score: number | null;
  success_rate: number;
  readmission_rate: number;
}

export interface RecoveryTrendPoint {
  week_start: string;
  average_recovery_score: number | null;
  sample_size: number;
}

export interface TreatmentComparison {
  treatment_name: string;
  sample_size: number;
  average_recovery_score: number | null;
  success_rate: number;
  readmission_rate: number;
}

export interface ReadmissionReduction {
  treatment_name: string;
  treatment_readmission_rate: number;
  hospital_baseline_readmission_rate: number;
  sample_size: number;
}

// ---------------------------------------------------------------------------
// Hospital & research analytics (backend/app/schemas/analytics.py)
// ---------------------------------------------------------------------------

export interface ReadmissionTrendPoint {
  month: string;
  total_admissions: number;
  readmission_rate: number;
}

export interface DischargeOutcomeDistribution {
  distribution: Record<string, number>;
}

export interface DepartmentAnalytics {
  department: string;
  total_patients: number;
  total_admissions: number;
  average_length_of_stay: number;
  readmission_rate: number;
}

export type DepartmentSortField =
  | 'department'
  | 'total_admissions'
  | 'readmission_rate'
  | 'average_length_of_stay';

export type SortOrder = 'asc' | 'desc';

export type TrendMetric = 'outcome' | 'risk';

export interface TrendPoint {
  period: string;
  total: number;
  breakdown: Record<string, number>;
}

export interface PopulationHealthSummary {
  total_patients: number;
  demographic_distribution: Record<'age_group' | 'gender' | 'race', Record<string, number>>;
  disease_prevalence: Record<string, number>;
}

export interface CohortStatistics {
  cohort_size: number;
  age_band_distribution: Record<string, number>;
  gender_distribution: Record<string, number>;
  diagnosis_distribution: Record<string, number>;
}

/** Researcher-facing patient view: no MRN, a pseudonymous id, a generalised age band. */
export interface AnonymisedPatient {
  pseudo_id: string;
  age_group: string | null;
  gender: string | null;
  primary_diagnosis: string | null;
}

export interface ResearchCohortFilters {
  diagnosis?: string;
  gender?: string;
  age_band?: string;
  date_from?: string;
  date_to?: string;
}

/** Body of a 422 raised by any cohort-size / small-sample guard. */
export interface CohortTooSmallDetail {
  error: 'cohort_too_small';
  minimum: number;
  actual: number;
}

// ---------------------------------------------------------------------------
// Reporting (backend/app/schemas/report.py)
// ---------------------------------------------------------------------------

export type ReportType =
  | 'treatment_effectiveness'
  | 'patient_outcomes'
  | 'department_performance'
  | 'population_health'
  | 'risk_distribution'
  | 'readmission_analytics'
  | 'research_cohort';

export type ReportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  months?: number;
  treatment_name?: string;
  department?: string;
  diagnosis?: string;
  gender?: string;
  age_band?: string;
}

export type ReportFilterKey = keyof ReportFilters;

export interface ReportGenerateRequest {
  report_type: ReportType;
  format: ReportFormat;
  filters: ReportFilters;
}

export interface Report {
  id: number;
  report_type: ReportType;
  format: ReportFormat;
  generated_by: number;
  generated_at: string;
  filters: ReportFilters;
  file_size_bytes: number;
  download_url: string;
}

export interface ReportPurgeResult {
  deleted: number;
  older_than_days: number;
}
