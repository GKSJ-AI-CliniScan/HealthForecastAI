/**
 * Milestone 3 Analytics Types
 */

export interface TreatmentTypeDistribution {
  treatment_type: string;
  count: number;
  avg_effectiveness?: number | null;
}

export interface TreatmentAnalyticsResponse {
  total_treatments: number;
  completed_treatments: number;
  average_effectiveness?: number | null;
  effectiveness_rate?: number | null;
  outcome_distribution: Record<string, number>;
  type_distribution: TreatmentTypeDistribution[];
  status_distribution: Record<string, number>;
}

export interface TreatmentAnalyticsFilters {
  start_date?: string;
  end_date?: string;
  department?: string;
  treatment_type?: string;
  outcome?: string;
}

export interface RecoveryTimelineEvent {
  event_type: 'ADMISSION' | 'TREATMENT' | 'TREATMENT_OUTCOME' | 'OUTCOME' | 'DISCHARGE';
  event_date: string;
  title: string;
  status?: string | null;
  score?: number | null;
  details: Record<string, any>;
}

export interface PatientRecoveryResponse {
  patient_id: string;
  timeline: RecoveryTimelineEvent[];
  average_length_of_stay?: number | null;
  total_admissions: number;
  total_treatments: number;
  recovery_status?: string | null;
  latest_outcome_score?: number | null;
  outcome_progression: Array<{
    date: string;
    status: string;
    score?: number | null;
    notes?: string | null;
  }>;
}

export interface MedicationSummaryItem {
  medication_name: string;
  total_patients: number;
  active_count: number;
  completed_count: number;
  avg_effectiveness?: number | null;
  outcome_distribution: Record<string, number>;
}

export interface MedicationAnalyticsResponse {
  total_medications: number;
  active_medications: number;
  completed_medications: number;
  average_effectiveness?: number | null;
  outcome_distribution: Record<string, number>;
  medication_breakdown: MedicationSummaryItem[];
}

export interface ReadmissionStat {
  total_assessed: number;
  readmission_rate_pct: number;
  high_risk_count: number;
  critical_risk_count: number;
}

export interface HospitalPerformanceResponse {
  total_patients: number;
  total_admissions: number;
  total_treatments: number;
  treatment_completion_rate: number;
  average_length_of_stay: number;
  average_treatment_effectiveness?: number | null;
  patient_outcome_distribution: Record<string, number>;
  readmission_statistics: ReadmissionStat;
  department_count: number;
}

export interface DepartmentAnalyticsItem {
  department: string;
  patients: number;
  admissions: number;
  average_length_of_stay: number;
  treatments: number;
  treatment_effectiveness?: number | null;
  outcome_distribution: Record<string, number>;
}

export interface DepartmentAnalyticsResponse {
  departments: DepartmentAnalyticsItem[];
}

export interface OutcomeTrendPoint {
  date: string;
  improved: number;
  stable: number;
  worsened: number;
  other: number;
}

export interface PatientOutcomeAnalyticsResponse {
  total_outcomes_recorded: number;
  outcome_distribution: Record<string, number>;
  improvement_rate_pct?: number | null;
  outcome_trends: OutcomeTrendPoint[];
  recovery_status_distribution: Record<string, number>;
}

export interface HealthcareTrendPoint {
  period: string;
  admissions: number;
  discharges: number;
  treatments: number;
  readmissions: number;
  high_risk_patients: number;
  improved_outcomes: number;
}

export interface HealthcareTrendsResponse {
  frequency: 'daily' | 'weekly' | 'monthly';
  start_date?: string | null;
  end_date?: string | null;
  trends: HealthcareTrendPoint[];
}
