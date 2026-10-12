export type Role = 'doctor' | 'hospital_admin' | 'researcher' | 'system_admin';

export type RiskCategory = 'low' | 'medium' | 'high';

export const ROLE_LABELS: Record<Role, string> = {
  doctor: 'Doctor',
  hospital_admin: 'Hospital Administrator',
  researcher: 'Healthcare Researcher',
  system_admin: 'System Administrator',
};

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  permissions: string[];
}

export interface Patient {
  id: number;
  medical_record_number: string;
  age_group: string | null;
  gender: string | null;
  race: string | null;
  primary_diagnosis: string | null;
  assigned_doctor_id: number | null;
}

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
}

export interface PatientDetail extends Patient {
  admissions: Admission[];
}

export interface AnonymisedPatient {
  pseudo_id: string;
  age_group: string | null;
  gender: string | null;
  primary_diagnosis: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardSummary {
  scope: 'caseload' | 'hospital';
  total_patients: number;
  total_admissions: number;
  readmissions_within_30_days: number;
  readmission_rate: number;
  average_length_of_stay: number;
  risk_distribution?: Record<RiskCategory, number>;
}

export interface AgeBandStat {
  age_group: string;
  admissions: number;
  readmissions: number;
  readmission_rate: number;
}

export interface AdmissionTypeStat {
  admission_type: string;
  admissions: number;
  readmissions: number;
  readmission_rate: number;
}

export interface LengthOfStayBucket {
  days: number;
  admissions: number;
}

export interface PopulationHealth {
  cohort_size: number;
  by_gender: { gender: string; patients: number }[];
  by_race: { race: string; patients: number }[];
  by_age_group: AgeBandStat[];
}

// ---------- Milestone 2: risk prediction ----------

export interface RiskDriver {
  feature: string;
  weight: number;
  direction: string;
}

export interface ScoredPatient {
  patient_id: number;
  medical_record_number: string;
  age_group: string | null;
  gender: string | null;
  primary_diagnosis: string | null;
  readmission_probability: number;
  risk_category: RiskCategory;
  model_version: string;
}

export type ScoredPatientPage = Page<ScoredPatient>;

export interface ReadmissionForecast {
  scope: 'caseload' | 'hospital';
  horizon_days: number;
  patients_scored: number;
  expected_readmissions: number;
  expected_rate: number;
  risk_distribution: Record<RiskCategory, number>;
  model_version: string | null;
  basis: string;
}

export interface CalibrationBand {
  risk_category: RiskCategory;
  patients: number;
  predicted_rate: number;
  observed_readmissions: number;
  observed_rate: number;
}

export interface CalibrationReport {
  bands: CalibrationBand[];
}

export interface PatientRiskScore {
  patient_id: number;
  readmission_probability: number;
  risk_category: RiskCategory;
  flagged: boolean;
  decision_threshold: number;
  model_name: string;
  model_version: string;
  features_supplied?: number | null;
  features_expected?: number | null;
  created_at?: string | null;
}

// ---------- Milestone 3: CDS & Treatment Effectiveness ----------

export interface CareRecommendationsResponse {
  patient_id: number;
  risk_category: RiskCategory;
  readmission_probability: number;
  recommendations: string[];
  follow_up_days: number | null;
}

export interface DischargePlanCheckitem {
  item: string;
  completed: boolean;
}

export interface DischargePlanResponse {
  patient_id: number;
  risk_category: RiskCategory;
  ready_for_discharge: boolean | null;
  readiness_score: number;
  risk_mitigation: string[];
  checklist: DischargePlanCheckitem[];
}

export interface TreatmentEffectivenessSummary {
  treatment_name: string;
  patients_treated: number;
  average_recovery_score: number;
  readmission_rate: number;
}

export interface RecoveryTrendPoint {
  week: string;
  average_recovery_score: number;
}

export interface TreatmentRegimenDetail extends TreatmentEffectivenessSummary {
  category: string;
  primary_indication: string;
  avg_cost_per_stay: number;
  adverse_event_rate: number;
  adherence_rate: number;
  average_los_days: number;
  efficacy_tier: 'High' | 'Moderate' | 'Under Review';
  contraindications: string[];
}

export interface MedicationOutcomeStat {
  drug_class: string;
  dosage_status: 'Adjusted (Ch)' | 'Unchanged (No)' | 'Initiated' | 'Discontinued';
  patients_count: number;
  readmission_rate: number;
  avg_recovery_score: number;
  glycemic_control_delta: string;
}

export interface PolypharmacyStat {
  medication_range: string;
  patient_count: number;
  readmission_rate: number;
  risk_multiplier: number;
  avg_adverse_events: number;
}

export interface DepartmentPerformanceStat {
  department: string;
  total_beds: number;
  active_patients: number;
  occupancy_rate: number;
  average_los: number;
  readmission_rate: number;
  target_readmission_rate: number;
  recovery_rate: number;
  patient_satisfaction: number;
  protocol_compliance: number;
  preventable_readmissions_cost: number;
}

export interface HospitalQualityKPIs {
  overall_readmission_rate: number;
  cms_national_benchmark: number;
  hospital_wide_recovery_rate: number;
  average_length_of_stay: number;
  alos_target: number;
  bed_turnover_rate: number;
  clinical_protocol_compliance: number;
  projected_annual_cost_savings: number;
  cms_penalty_risk_tier: 'Low' | 'Moderate' | 'High';
  quality_star_rating: number;
}

export interface TrendDataPoint {
  period: string;
  readmission_rate: number;
  moving_average: number;
  upper_control_limit: number;
  lower_control_limit: number;
  admissions_volume: number;
  projected_rate?: number;
}

export interface EarlyWarningAlert {
  id: string;
  timestamp: string;
  department: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric_name: string;
  current_value: string;
  baseline_value: string;
  recommended_action: string;
}

export interface PatientOutcomeRecord {
  id: number;
  medical_record_number: string;
  age_group: string;
  gender: string;
  primary_diagnosis: string;
  treatment_regimen: string;
  dosage_adjusted: boolean;
  recovery_score: number;
  outcome_category: 'Full Recovery' | 'Partial Improvement' | 'Readmitted (<30d)' | 'Chronic Care';
  time_in_hospital: number;
  num_medications: number;
  discharge_status: string;
  follow_up_completed: boolean;
}


