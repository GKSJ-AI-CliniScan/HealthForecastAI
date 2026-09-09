import {
  ForecastDataPoint,
  DepartmentForecast,
  ClinicalForecastInsight,
  ReadmissionForecastSummary,
  ForecastHorizon,
  ForecastScope,
} from '@/types/forecast';

/**
 * MOCK READMISSION FORECASTING DATA & SIMULATION ENGINE
 *
 * NOTICE: All historical time-series benchmarks, forecast projections, and clinical insights
 * in this file are simulated demonstrative artifacts designed for healthcare analytics prototyping.
 * They illustrate forecasting workflow capabilities during Milestone 2 and do NOT represent live hospital operations.
 */

export const MOCK_FORECAST_MODEL_DETAILS = {
  name: 'Prophet-ARIMA-Ensemble-Readmission-Forecaster',
  version: 'v2.1.0-forecast-demo',
  trainingCohort: 'Hospital Historical Encounters (36-Month Rolling Window, 101k Records)',
  meanAbsoluteError: 0.42, // ±0.42% error margin
};

export const MOCK_HISTORICAL_SERIES: ForecastDataPoint[] = [
  {
    period: 'Sep 2025',
    date: '2025-09',
    isForecast: false,
    actualRate: 10.2,
    forecastedRate: null,
    lowerBound: null,
    upperBound: null,
    totalAdmissions: 242,
    predictedReadmissions: 25,
  },
  {
    period: 'Oct 2025',
    date: '2025-10',
    isForecast: false,
    actualRate: 9.85,
    forecastedRate: null,
    lowerBound: null,
    upperBound: null,
    totalAdmissions: 256,
    predictedReadmissions: 25,
  },
  {
    period: 'Nov 2025',
    date: '2025-11',
    isForecast: false,
    actualRate: 10.4,
    forecastedRate: null,
    lowerBound: null,
    upperBound: null,
    totalAdmissions: 270,
    predictedReadmissions: 28,
  },
  {
    period: 'Dec 2025',
    date: '2025-12',
    isForecast: false,
    actualRate: 10.9,
    forecastedRate: null,
    lowerBound: null,
    upperBound: null,
    totalAdmissions: 295,
    predictedReadmissions: 32,
  },
  {
    period: 'Jan 2026',
    date: '2026-01',
    isForecast: false,
    actualRate: 10.15,
    forecastedRate: null,
    lowerBound: null,
    upperBound: null,
    totalAdmissions: 280,
    predictedReadmissions: 28,
  },
  {
    period: 'Feb 2026',
    date: '2026-02',
    isForecast: false,
    actualRate: 9.48,
    forecastedRate: 9.48,
    lowerBound: 9.1,
    upperBound: 9.8,
    totalAdmissions: 265,
    predictedReadmissions: 25,
  },
];

export const MOCK_PROJECTED_SERIES: ForecastDataPoint[] = [
  {
    period: 'Mar 2026 (FC)',
    date: '2026-03',
    isForecast: true,
    actualRate: null,
    forecastedRate: 9.15,
    lowerBound: 8.5,
    upperBound: 9.8,
    totalAdmissions: 272,
    predictedReadmissions: 25,
  },
  {
    period: 'Apr 2026 (FC)',
    date: '2026-04',
    isForecast: true,
    actualRate: null,
    forecastedRate: 8.82,
    lowerBound: 8.1,
    upperBound: 9.55,
    totalAdmissions: 260,
    predictedReadmissions: 23,
  },
  {
    period: 'May 2026 (FC)',
    date: '2026-05',
    isForecast: true,
    actualRate: null,
    forecastedRate: 8.6,
    lowerBound: 7.8,
    upperBound: 9.4,
    totalAdmissions: 255,
    predictedReadmissions: 22,
  },
  {
    period: 'Jun 2026 (FC)',
    date: '2026-06',
    isForecast: true,
    actualRate: null,
    forecastedRate: 8.45,
    lowerBound: 7.55,
    upperBound: 9.35,
    totalAdmissions: 250,
    predictedReadmissions: 21,
  },
  {
    period: 'Jul 2026 (FC)',
    date: '2026-07',
    isForecast: true,
    actualRate: null,
    forecastedRate: 8.3,
    lowerBound: 7.3,
    upperBound: 9.3,
    totalAdmissions: 248,
    predictedReadmissions: 21,
  },
  {
    period: 'Aug 2026 (FC)',
    date: '2026-08',
    isForecast: true,
    actualRate: null,
    forecastedRate: 8.15,
    lowerBound: 7.1,
    upperBound: 9.2,
    totalAdmissions: 245,
    predictedReadmissions: 20,
  },
];

export const MOCK_DEPARTMENT_FORECASTS: DepartmentForecast[] = [
  {
    departmentId: 'nephrology',
    departmentName: 'Nephrology & Renal Medicine',
    currentRate: 14.6,
    projectedRate: 13.9,
    rateChange: -0.7,
    trend: 'improving',
    patientVolume: 340,
    riskTier: 'high',
  },
  {
    departmentId: 'endocrinology',
    departmentName: 'Endocrinology & Diabetic Care',
    currentRate: 12.4,
    projectedRate: 10.8,
    rateChange: -1.6,
    trend: 'improving',
    patientVolume: 580,
    riskTier: 'high',
  },
  {
    departmentId: 'cardiology',
    departmentName: 'Cardiology & Vascular Center',
    currentRate: 11.2,
    projectedRate: 10.1,
    rateChange: -1.1,
    trend: 'improving',
    patientVolume: 620,
    riskTier: 'medium',
  },
  {
    departmentId: 'internal_medicine',
    departmentName: 'Internal Medicine General Ward',
    currentRate: 9.8,
    projectedRate: 9.2,
    rateChange: -0.6,
    trend: 'improving',
    patientVolume: 910,
    riskTier: 'medium',
  },
  {
    departmentId: 'emergency',
    departmentName: 'Emergency & Acute Care Services',
    currentRate: 8.4,
    projectedRate: 7.9,
    rateChange: -0.5,
    trend: 'improving',
    patientVolume: 440,
    riskTier: 'low',
  },
];

export const MOCK_CLINICAL_FORECAST_INSIGHTS: ClinicalForecastInsight[] = [
  {
    id: 'cfi-1',
    title: 'Projected 0.73% Readmission Rate Reduction by Q2 2026',
    category: 'clinical_protocol',
    summary: 'Aggregated forecasting models indicate an expected decrease from 9.48% to 8.75% across the facility.',
    clinicalImplication: 'Early post-discharge follow-up programs initiated in Internal Medicine and Endocrinology are beginning to reflect in lower readmission probabilities.',
    actionableRecommendation: 'Maintain 7-day post-discharge nurse telehealth contacts for diabetic cohort patients with HbA1c > 8.0%.',
    impactLevel: 'high',
  },
  {
    id: 'cfi-2',
    title: 'Nephrology Remains Highest Readmission Risk Center (13.9%)',
    category: 'department_focus',
    summary: 'Despite an overall downward trajectory, renal patients with Stage 4-5 CKD carry a 1.6x higher readmission probability than baseline.',
    clinicalImplication: 'Volume overload and electrolyte instability frequently trigger re-hospitalization within 14 days of discharge.',
    actionableRecommendation: 'Establish mandatory direct nephrology outpatient clinic appointments prior to hospital discharge for all renal inpatients.',
    impactLevel: 'high',
  },
  {
    id: 'cfi-3',
    title: 'Estimated 26 Preventable Hospital Readmissions Over Next 90 Days',
    category: 'capacity',
    summary: 'Proactive transitional care can prevent an estimated 26 readmissions over the upcoming 3-month horizon.',
    clinicalImplication: 'Preventing these encounters frees up approximately 110 inpatient bed-days, stabilizing overall hospital bed occupancy.',
    actionableRecommendation: 'Deploy clinical pharmacy medication reconciliation protocols for high-polypharmacy discharges (12+ medications).',
    impactLevel: 'medium',
  },
  {
    id: 'cfi-4',
    title: 'CMS Hospital Readmissions Reduction Program (HRRP) Financial Safeguard',
    category: 'financial_impact',
    summary: 'Forecasted readmission rates remain within the safe zone below the 9.5% CMS penalty threshold.',
    clinicalImplication: 'Safeguards hospital Medicare reimbursement rates from quality penalty adjustments.',
    actionableRecommendation: 'Continue monthly departmental quality audits and automated high-risk patient flags in electronic records.',
    impactLevel: 'medium',
  },
];

const SCOPE_LABELS: Record<ForecastScope, string> = {
  hospital: 'Entire Hospital Facility (All Departments)',
  cardiology: 'Cardiology & Vascular Center',
  endocrinology: 'Endocrinology & Diabetic Care',
  internal_medicine: 'Internal Medicine General Ward',
  nephrology: 'Nephrology & Renal Medicine',
};

/**
 * Generate simulated readmission forecast summary for a given horizon and scope.
 */
export function generateMockForecastSummary(
  horizon: ForecastHorizon = '90d',
  scope: ForecastScope = 'hospital',
): ReadmissionForecastSummary {
  let horizonDays = 90;
  let monthsCount = 3;

  switch (horizon) {
    case '30d':
      horizonDays = 30;
      monthsCount = 1;
      break;
    case '60d':
      horizonDays = 60;
      monthsCount = 2;
      break;
    case '90d':
      horizonDays = 90;
      monthsCount = 3;
      break;
    case '180d':
      horizonDays = 180;
      monthsCount = 6;
      break;
    case '365d':
      horizonDays = 365;
      monthsCount = 6; // Display 6 months projection
      break;
  }

  // Combine historical and sliced projected series
  const activeForecastSeries = MOCK_PROJECTED_SERIES.slice(0, monthsCount);
  const trendSeries = [...MOCK_HISTORICAL_SERIES, ...activeForecastSeries];

  // Base rates depending on department scope
  let baselineRate = 9.48;
  let projectedRate = 8.75;
  let predictedReadmissions = 25;
  let preventableEstimate = 8;

  if (scope === 'nephrology') {
    baselineRate = 14.6;
    projectedRate = 13.9;
    predictedReadmissions = 47;
    preventableEstimate = 12;
  } else if (scope === 'endocrinology') {
    baselineRate = 12.4;
    projectedRate = 10.8;
    predictedReadmissions = 62;
    preventableEstimate = 18;
  } else if (scope === 'cardiology') {
    baselineRate = 11.2;
    projectedRate = 10.1;
    predictedReadmissions = 63;
    preventableEstimate = 16;
  } else if (scope === 'internal_medicine') {
    baselineRate = 9.8;
    projectedRate = 9.2;
    predictedReadmissions = 84;
    preventableEstimate = 20;
  } else {
    // Hospital-wide
    predictedReadmissions = Math.round(25 * (horizonDays / 30));
    preventableEstimate = Math.round(8 * (horizonDays / 30));
  }

  const projectedRateChange = parseFloat((projectedRate - baselineRate).toFixed(2));

  return {
    scope,
    scopeLabel: SCOPE_LABELS[scope] || 'Hospital-Wide',
    horizonDays,
    horizonKey: horizon,
    baselineRate,
    projectedRate,
    projectedRateChange,
    predictedReadmissions,
    preventableReadmissionsEstimate: preventableEstimate,
    nationalBenchmarkRate: 8.0,
    confidenceInterval: {
      lower: parseFloat((projectedRate - 0.65).toFixed(2)),
      upper: parseFloat((projectedRate + 0.65).toFixed(2)),
      confidenceLevelPercent: 95,
    },
    modelDetails: MOCK_FORECAST_MODEL_DETAILS,
    trendSeries,
    departmentBreakdown: MOCK_DEPARTMENT_FORECASTS,
    clinicalInsights: MOCK_CLINICAL_FORECAST_INSIGHTS,
    isSimulated: true,
    dataSource: 'simulated_mock',
    generatedAt: new Date().toISOString(),
  };
}
