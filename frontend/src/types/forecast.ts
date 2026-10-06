export type ForecastHorizon = '30d' | '60d' | '90d' | '180d' | '365d';

export type ForecastScope =
  | 'hospital'
  | 'cardiology'
  | 'endocrinology'
  | 'internal_medicine'
  | 'nephrology';

export interface ForecastDataPoint {
  period: string; // e.g. 'Oct 2025', 'Nov 2025', 'Feb 2026 (Forecast)'
  date: string; // ISO date or 'YYYY-MM'
  isForecast: boolean;
  actualRate?: number | null; // e.g. 9.48 (%)
  forecastedRate?: number | null; // e.g. 8.75 (%)
  lowerBound?: number | null; // 95% CI lower
  upperBound?: number | null; // 95% CI upper
  totalAdmissions: number;
  predictedReadmissions: number;
}

export interface DepartmentForecast {
  departmentId: string;
  departmentName: string;
  currentRate: number;
  projectedRate: number;
  rateChange: number; // e.g. -0.8
  trend: 'improving' | 'worsening' | 'stable';
  patientVolume: number;
  riskTier: 'high' | 'medium' | 'low';
}

export type ClinicalInsightImpact = 'high' | 'medium' | 'low';

export interface ClinicalForecastInsight {
  id: string;
  title: string;
  category: 'capacity' | 'clinical_protocol' | 'department_focus' | 'financial_impact';
  summary: string;
  clinicalImplication: string;
  actionableRecommendation: string;
  impactLevel: ClinicalInsightImpact;
}

export interface ReadmissionForecastSummary {
  scope: ForecastScope;
  scopeLabel: string;
  horizonDays: number;
  horizonKey: ForecastHorizon;
  baselineRate: number; // e.g. 9.48%
  projectedRate: number; // e.g. 8.75%
  projectedRateChange: number; // e.g. -0.73%
  predictedReadmissions: number; // count
  preventableReadmissionsEstimate: number; // count
  nationalBenchmarkRate: number; // e.g. 8.0%
  confidenceInterval: {
    lower: number;
    upper: number;
    confidenceLevelPercent: number; // e.g. 95
  };
  modelDetails: {
    name: string;
    version: string;
    trainingCohort: string;
    meanAbsoluteError: number;
  };
  trendSeries: ForecastDataPoint[];
  departmentBreakdown: DepartmentForecast[];
  clinicalInsights: ClinicalForecastInsight[];
  isSimulated: boolean;
  dataSource: 'simulated_mock' | 'fastapi_ml_backend';
  generatedAt: string;
}

export interface ForecastApiResponse {
  scope: string;
  horizon_days: number;
  predicted_readmissions: number;
  predicted_rate: number;
}
