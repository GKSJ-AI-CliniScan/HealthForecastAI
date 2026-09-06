import { RiskCategory } from './auth';

export interface DashboardStats {
  scope: 'assigned' | 'hospital' | 'research' | 'system';
  total_patients: number;
  total_admissions: number;
  readmitted_within_30_days: number;
  readmission_rate_percent: number;
  average_length_of_stay_days: number;
  high_risk_patients_count?: number;
  bed_occupancy_percent?: number;
  active_research_cohorts?: number;
  system_uptime_percent?: number;
  can_export: boolean;
}

export interface RiskPrediction {
  patient_id: number;
  readmission_probability: number;
  risk_category: RiskCategory;
  model_name: string;
  model_version: string;
  contributing_factors?: string[];
}

export interface ActivityFeedItem {
  id: string;
  timestamp: string;
  patientName: string;
  patientMrn: string;
  action: string;
  riskLevel?: RiskCategory;
  doctorName: string;
}

export interface MetricCardData {
  label: string;
  value: string | number;
  caption?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  isUrgent?: boolean;
}

export interface HospitalAnalyticsSummary {
  total_patients: number;
  total_admissions: number;
  readmission_rate: number;
  average_length_of_stay: number;
  risk_distribution: Record<RiskCategory, number>;
}
