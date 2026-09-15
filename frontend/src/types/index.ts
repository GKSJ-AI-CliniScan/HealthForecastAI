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
  created_at: string | null;
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

/** Provenance for a generated report - GET /reports/forecast. */
export interface ReportMetadata {
  generated_at: string;
  generated_for_role: Role;
  scope: string;
  report_version: string;
  notes: string[];
}

/** One projection window inside a forecasting report. */
export interface ForecastHorizon {
  horizon_days: number;
  predicted_rate: number;
  predicted_readmissions: number;
}

/** One patient row in the high-risk cohort of a forecasting report. */
export interface CohortRiskEntry {
  patient_id: number;
  medical_record_number: string | null;
  readmission_probability: number;
  risk_category: RiskCategory;
  scored_at: string | null;
}

/**
 * GET /reports/forecast.
 *
 * `high_risk_patients` is null when the caller may not see identifiable rows
 * (a researcher), and an empty array when they may but none matched. The two
 * are deliberately distinct - see the backend report service.
 */
export interface ForecastingReport {
  metadata: ReportMetadata;
  patients_in_scope: number;
  patients_scored: number;
  coverage_rate: number;
  risk_distribution: Record<RiskCategory, number>;
  average_risk_probability: number;
  horizons: ForecastHorizon[];
  total_admissions: number;
  observed_readmissions: number;
  observed_readmission_rate: number;
  high_risk_patients: CohortRiskEntry[] | null;
}

/** One plain-language driver behind a patient's risk band. */
export interface RiskFactor {
  factor: string;
  detail: string;
}

/** GET /reports/patients/{patient_id} - FR-RPT-03. */
export interface PatientRiskReport {
  metadata: ReportMetadata;

  patient_id: number;
  medical_record_number: string;
  age_group: string | null;
  gender: string | null;
  primary_diagnosis: string | null;
  assigned_doctor_id: number | null;

  // Null throughout when the patient has never been scored.
  readmission_probability: number | null;
  risk_category: RiskCategory | null;
  model_name: string | null;
  model_version: string | null;
  scored_at: string | null;

  total_admissions: number;
  readmitted_total: number;
  readmissions_by_label: Record<string, number>;
  average_length_of_stay: number;
  last_admission_date: string | null;

  risk_factors: RiskFactor[];
}
