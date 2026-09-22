import {
  HospitalAnalyticsSummary,
  ReadmissionTrendPoint,
  TreatmentEffectiveness,
  RecoveryTrendPoint,
  RecoveryRegimenInfo,
  AnalyticsFilterParams,
  AnalyticsDashboardData,
  DepartmentAnalytics,
} from '@/types';

export const MOCK_DEPARTMENT_BREAKDOWN: DepartmentAnalytics[] = [
  {
    department: 'Cardiology',
    departmentKey: 'cardiology',
    totalAdmissions: 412,
    readmissionRate: 9.2,
    averageLos: 5.1,
    highRiskCount: 58,
    trend: 'improving',
  },
  {
    department: 'Endocrinology / Diabetes',
    departmentKey: 'endocrinology',
    totalAdmissions: 528,
    readmissionRate: 7.4,
    averageLos: 3.9,
    highRiskCount: 42,
    trend: 'improving',
  },
  {
    department: 'Internal Medicine',
    departmentKey: 'internal_medicine',
    totalAdmissions: 630,
    readmissionRate: 9.8,
    averageLos: 4.6,
    highRiskCount: 71,
    trend: 'stable',
  },
  {
    department: 'Nephrology',
    departmentKey: 'nephrology',
    totalAdmissions: 254,
    readmissionRate: 8.6,
    averageLos: 4.8,
    highRiskCount: 34,
    trend: 'improving',
  },
];

export const MOCK_HOSPITAL_SUMMARY: HospitalAnalyticsSummary = {
  total_patients: 1824,
  total_admissions: 1824,
  readmission_rate: 8.42,
  average_length_of_stay: 4.35,
  national_benchmark_rate: 8.0,
  risk_distribution: {
    low: 1120,
    medium: 498,
    high: 206,
  },
  department_breakdown: MOCK_DEPARTMENT_BREAKDOWN,
};

export const MOCK_READMISSION_TRENDS: Record<string, ReadmissionTrendPoint[]> = {
  all: [
    { period: 'Sep 2025', rate: 10.1, benchmark: 8.0, admissions: 310, readmissions: 31 },
    { period: 'Oct 2025', rate: 9.7, benchmark: 8.0, admissions: 295, readmissions: 29 },
    { period: 'Nov 2025', rate: 9.2, benchmark: 8.0, admissions: 308, readmissions: 28 },
    { period: 'Dec 2025', rate: 8.9, benchmark: 8.0, admissions: 322, readmissions: 29 },
    { period: 'Jan 2026', rate: 8.6, benchmark: 8.0, admissions: 285, readmissions: 25 },
    { period: 'Feb 2026', rate: 8.4, benchmark: 8.0, admissions: 304, readmissions: 26 },
  ],
  cardiology: [
    { period: 'Sep 2025', rate: 11.2, benchmark: 8.5, admissions: 68, readmissions: 8 },
    { period: 'Oct 2025', rate: 10.6, benchmark: 8.5, admissions: 65, readmissions: 7 },
    { period: 'Nov 2025', rate: 10.0, benchmark: 8.5, admissions: 72, readmissions: 7 },
    { period: 'Dec 2025', rate: 9.8, benchmark: 8.5, admissions: 70, readmissions: 7 },
    { period: 'Jan 2026', rate: 9.5, benchmark: 8.5, admissions: 66, readmissions: 6 },
    { period: 'Feb 2026', rate: 9.2, benchmark: 8.5, admissions: 71, readmissions: 7 },
  ],
  endocrinology: [
    { period: 'Sep 2025', rate: 9.4, benchmark: 7.5, admissions: 88, readmissions: 8 },
    { period: 'Oct 2025', rate: 8.8, benchmark: 7.5, admissions: 84, readmissions: 7 },
    { period: 'Nov 2025', rate: 8.2, benchmark: 7.5, admissions: 91, readmissions: 7 },
    { period: 'Dec 2025', rate: 7.9, benchmark: 7.5, admissions: 89, readmissions: 7 },
    { period: 'Jan 2026', rate: 7.6, benchmark: 7.5, admissions: 86, readmissions: 7 },
    { period: 'Feb 2026', rate: 7.4, benchmark: 7.5, admissions: 90, readmissions: 7 },
  ],
  internal_medicine: [
    { period: 'Sep 2025', rate: 11.5, benchmark: 8.5, admissions: 108, readmissions: 12 },
    { period: 'Oct 2025', rate: 10.9, benchmark: 8.5, admissions: 102, readmissions: 11 },
    { period: 'Nov 2025', rate: 10.4, benchmark: 8.5, admissions: 105, readmissions: 11 },
    { period: 'Dec 2025', rate: 10.1, benchmark: 8.5, admissions: 112, readmissions: 11 },
    { period: 'Jan 2026', rate: 9.9, benchmark: 8.5, admissions: 99, readmissions: 10 },
    { period: 'Feb 2026', rate: 9.8, benchmark: 8.5, admissions: 104, readmissions: 10 },
  ],
  nephrology: [
    { period: 'Sep 2025', rate: 10.3, benchmark: 8.0, admissions: 46, readmissions: 5 },
    { period: 'Oct 2025', rate: 9.8, benchmark: 8.0, admissions: 44, readmissions: 4 },
    { period: 'Nov 2025', rate: 9.4, benchmark: 8.0, admissions: 40, readmissions: 4 },
    { period: 'Dec 2025', rate: 9.0, benchmark: 8.0, admissions: 51, readmissions: 5 },
    { period: 'Jan 2026', rate: 8.8, benchmark: 8.0, admissions: 34, readmissions: 3 },
    { period: 'Feb 2026', rate: 8.6, benchmark: 8.0, admissions: 39, readmissions: 3 },
  ],
};

export const MOCK_TREATMENT_EFFECTIVENESS: TreatmentEffectiveness[] = [
  {
    treatment_name: 'Post-Discharge Tele-Care & Remote Vitals Monitoring',
    category: 'care_coordination',
    patients_treated: 284,
    average_recovery_score: 91.4,
    readmission_rate: 4.9,
    average_los_days: 3.4,
    adherence_rate_percent: 94,
    primary_indication: 'High-risk cardiovascular & multi-comorbid diabetic dischargees',
  },
  {
    treatment_name: 'Intensive Basal-Bolus Insulin Optimization + CGM Protocol',
    category: 'pharmacological',
    patients_treated: 348,
    average_recovery_score: 86.8,
    readmission_rate: 6.8,
    average_los_days: 4.1,
    adherence_rate_percent: 91,
    primary_indication: 'Uncontrolled Type 2 Diabetes with HbA1c > 9.0%',
  },
  {
    treatment_name: 'Dual Incretin Therapy (GLP-1 RA + SGLT2 Inhibitor)',
    category: 'pharmacological',
    patients_treated: 412,
    average_recovery_score: 85.2,
    readmission_rate: 7.1,
    average_los_days: 3.8,
    adherence_rate_percent: 89,
    primary_indication: 'Cardio-Renal metabolic syndrome & diabetic nephropathy risk',
  },
  {
    treatment_name: 'Multidisciplinary Heart Failure Transition Pathway',
    category: 'care_coordination',
    patients_treated: 226,
    average_recovery_score: 80.6,
    readmission_rate: 8.8,
    average_los_days: 5.2,
    adherence_rate_percent: 86,
    primary_indication: 'Congestive Heart Failure NYHA Class II-III',
  },
  {
    treatment_name: 'Renoprotective ACEi/ARB + Nephrology Protocol',
    category: 'pharmacological',
    patients_treated: 178,
    average_recovery_score: 77.4,
    readmission_rate: 8.6,
    average_los_days: 4.7,
    adherence_rate_percent: 82,
    primary_indication: 'Chronic Kidney Disease Stage 3a/3b with microalbuminuria',
  },
  {
    treatment_name: 'Standard Inpatient Sliding Scale & Routine Discharge',
    category: 'pharmacological',
    patients_treated: 376,
    average_recovery_score: 72.8,
    readmission_rate: 11.2,
    average_los_days: 4.9,
    adherence_rate_percent: 78,
    primary_indication: 'General Inpatient Medical Admission Glycemic Care',
  },
];

export const MOCK_RECOVERY_REGIMENS: RecoveryRegimenInfo[] = [
  {
    key: 'telecare',
    name: 'Tele-Care & Remote Monitoring',
    color: '#0D9488', // Teal
    description: 'Daily biometric alerts with nurse follow-up at 48h & 7d',
    baselineScore: 52,
    targetScore: 92,
  },
  {
    key: 'intensive_insulin',
    name: 'Intensive Basal-Bolus + CGM',
    color: '#C96B4B', // Warm Brand Coral/Terracotta
    description: 'Titrated insulin with continuous glucose monitoring feedback',
    baselineScore: 48,
    targetScore: 87,
  },
  {
    key: 'glp1_sglt2',
    name: 'GLP-1 RA + SGLT2i Combination',
    color: '#D9A441', // Amber Gold
    description: 'Cardio-renal protective metabolic dual agent regimen',
    baselineScore: 50,
    targetScore: 85,
  },
  {
    key: 'standard_care',
    name: 'Standard Inpatient Care (Baseline)',
    color: '#6B625E', // Warm Text Muted
    description: 'Standard discharge instructions without automated follow-up',
    baselineScore: 45,
    targetScore: 73,
  },
];

export const MOCK_RECOVERY_TRENDS: RecoveryTrendPoint[] = [
  {
    timeframe: 'Day 1',
    telecare: 52.0,
    intensive_insulin: 48.0,
    glp1_sglt2: 50.0,
    standard_care: 45.0,
  },
  {
    timeframe: 'Day 5',
    telecare: 64.5,
    intensive_insulin: 59.2,
    glp1_sglt2: 58.0,
    standard_care: 52.1,
  },
  {
    timeframe: 'Day 10',
    telecare: 76.2,
    intensive_insulin: 69.8,
    glp1_sglt2: 67.5,
    standard_care: 59.4,
  },
  {
    timeframe: 'Day 15',
    telecare: 83.4,
    intensive_insulin: 77.5,
    glp1_sglt2: 74.8,
    standard_care: 64.2,
  },
  {
    timeframe: 'Day 20',
    telecare: 87.8,
    intensive_insulin: 82.3,
    glp1_sglt2: 80.1,
    standard_care: 68.5,
  },
  {
    timeframe: 'Day 30',
    telecare: 91.4,
    intensive_insulin: 86.8,
    glp1_sglt2: 85.2,
    standard_care: 72.8,
  },
];

export function generateMockAnalyticsData(
  params: AnalyticsFilterParams,
): AnalyticsDashboardData {
  const deptKey = params.department;
  const readmissionSeries =
    MOCK_READMISSION_TRENDS[deptKey] || MOCK_READMISSION_TRENDS.all;

  // Filter treatments if category provided
  let treatments = [...MOCK_TREATMENT_EFFECTIVENESS];
  if (params.treatmentCategory && params.treatmentCategory !== 'all') {
    treatments = treatments.filter((t) => t.category === params.treatmentCategory);
  }

  // Adjust summary values if a department is selected
  let summary = { ...MOCK_HOSPITAL_SUMMARY };
  if (deptKey !== 'all') {
    const deptInfo = MOCK_DEPARTMENT_BREAKDOWN.find((d) => d.departmentKey === deptKey);
    if (deptInfo) {
      summary = {
        ...summary,
        total_patients: deptInfo.totalAdmissions,
        total_admissions: deptInfo.totalAdmissions,
        readmission_rate: deptInfo.readmissionRate,
        average_length_of_stay: deptInfo.averageLos,
        risk_distribution: {
          low: Math.round(deptInfo.totalAdmissions * 0.58),
          medium: Math.round(deptInfo.totalAdmissions * 0.28),
          high: deptInfo.highRiskCount,
        },
      };
    }
  }

  return {
    summary,
    readmissionTrends: readmissionSeries,
    treatments,
    recoveryTrends: MOCK_RECOVERY_TRENDS,
    recoveryRegimens: MOCK_RECOVERY_REGIMENS,
    isSimulated: true,
    dataSource: 'simulated_mock',
    generatedAt: new Date().toISOString(),
  };
}
