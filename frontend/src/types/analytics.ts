/**
 * Healthcare Performance & Analytics Types - Milestone 3
 *
 * Aligns strictly with FastAPI backend schemas:
 * - /api/v1/analytics/summary (HospitalAnalyticsSummary)
 * - /api/v1/analytics/readmissions
 * - /api/v1/treatment (TreatmentEffectivenessSummary)
 * - /api/v1/treatment/recovery-trends
 */

import { HospitalAnalyticsSummary } from './dashboard';

export interface RiskDistributionData {
  low: number;
  medium: number;
  high: number;
}

export interface ReadmissionTrendPoint {
  period: string; // e.g. "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026"
  rate: number; // Recorded readmission rate (%)
  benchmark: number; // National/Institutional benchmark rate (%)
  admissions: number; // Total encounter volume
  readmissions: number; // Readmitted patient count
  department?: string;
}

export interface TreatmentEffectiveness {
  treatment_name: string;
  category?: 'pharmacological' | 'lifestyle_support' | 'surgical' | 'care_coordination';
  patients_treated: number;
  average_recovery_score: number; // 0 - 100 clinical recovery index
  readmission_rate: number; // % 30-day post-treatment readmission
  average_los_days?: number;
  adherence_rate_percent?: number;
  primary_indication?: string;
}

export interface RecoveryTrendPoint {
  timeframe: string; // e.g. "Day 3", "Day 7", "Day 14", "Day 21", "Day 30"
  [key: string]: string | number;
}

export interface RecoveryRegimenInfo {
  key: string;
  name: string;
  color: string;
  description: string;
  baselineScore: number;
  targetScore: number;
}

export type AnalyticsTimeframe = '30d' | '90d' | '6m' | '1y';

export type AnalyticsDepartment =
  | 'all'
  | 'cardiology'
  | 'endocrinology'
  | 'internal_medicine'
  | 'nephrology';

export interface AnalyticsFilterParams {
  timeframe: AnalyticsTimeframe;
  department: AnalyticsDepartment;
  treatmentCategory?: string;
}

export interface AnalyticsDashboardData {
  summary: HospitalAnalyticsSummary;
  readmissionTrends: ReadmissionTrendPoint[];
  treatments: TreatmentEffectiveness[];
  recoveryTrends: RecoveryTrendPoint[];
  recoveryRegimens: RecoveryRegimenInfo[];
  isSimulated: boolean;
  dataSource: 'simulated_mock' | 'fastapi_ml_backend';
  generatedAt: string;
}
