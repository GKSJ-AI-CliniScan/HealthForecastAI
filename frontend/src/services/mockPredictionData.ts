import {
  PatientRiskAssessment,
  RiskPredictionPayload,
  ModelMetadata,
  RiskFactor,
  ClinicalInsight,
} from '@/types';
import { RiskCategory } from '@/types/auth';

/**
 * MOCK PREDICTION DATA & SIMULATION ENGINE
 *
 * NOTICE: The predictions, risk factors, and clinical insights contained in this file
 * are simulated demonstrative artifacts designed for clinical workflow prototyping and
 * UI evaluation during Milestone 2. They do NOT constitute medical diagnoses or live clinical advice.
 */

export const MOCK_MODEL_METADATA: ModelMetadata = {
  modelName: 'ReadmissionRisk-RandomForest-Classifier',
  modelVersion: 'v2.1.0-demo',
  trainedOn: 'Diabetes 130-US Hospitals (1999-2008) Dataset (101,766 Encounters)',
  targetMetric: '30-Day Hospital Readmission (Binary)',
  rocAuc: 0.842,
  f1Score: 0.786,
  accuracy: 0.814,
  lastEvaluated: '2026-08-15',
};

export const MOCK_PATIENT_RISK_ASSESSMENTS: Record<number, PatientRiskAssessment> = {
  // Patient 1: Arthur Pendleton (High Risk)
  1: {
    patientId: 1,
    patientName: 'Arthur Pendleton',
    mrn: 'MRN-104928',
    ageGroup: '[70-80)',
    gender: 'Male',
    department: 'Internal Medicine / ICU',
    primaryDiagnosis: 'Type 2 Diabetes Mellitus with Ketoacidosis (ICD-9: 250.1)',
    readmissionProbability: 0.84,
    riskCategory: 'high',
    confidenceScore: 0.92,
    predictedReadmissionHorizonDays: 30,
    assessedAt: '2026-09-08T10:30:00Z',
    isSimulated: true,
    dataSource: 'simulated_mock',
    modelInfo: MOCK_MODEL_METADATA,
    riskFactors: [
      {
        id: 'rf-1-1',
        factorName: 'Multiple Prior Inpatient Encounters',
        category: 'utilization',
        impact: 'increase',
        weightPercent: 28,
        description: '3 inpatient admissions recorded in the preceding 12-month window.',
        patientValue: '3 admissions',
        benchmarkRange: '0 - 1 per year',
      },
      {
        id: 'rf-1-2',
        factorName: 'Elevated Glycated Hemoglobin (HbA1c)',
        category: 'clinical',
        impact: 'increase',
        weightPercent: 24,
        description: 'Most recent HbA1c test result exceeded glycemic target (> 8.0%).',
        patientValue: '9.4%',
        benchmarkRange: '< 7.0%',
      },
      {
        id: 'rf-1-3',
        factorName: 'Complex Polypharmacy Burden',
        category: 'medication',
        impact: 'increase',
        weightPercent: 18,
        description: '18 concurrent active prescription medications scheduled at discharge.',
        patientValue: '18 medications',
        benchmarkRange: '< 9 medications',
      },
      {
        id: 'rf-1-4',
        factorName: 'Prolonged Length of Stay',
        category: 'history',
        impact: 'increase',
        weightPercent: 14,
        description: 'Current hospitalization length (6 days) exceeds departmental average (4.2 days).',
        patientValue: '6 days',
        benchmarkRange: '3 - 4 days',
      },
      {
        id: 'rf-1-5',
        factorName: 'Established Primary Care Continuity',
        category: 'demographic',
        impact: 'decrease',
        weightPercent: 10,
        description: 'Documented active relationship with an outpatient cardiologist & primary care physician.',
        patientValue: 'Active Doctor Assigned',
        benchmarkRange: 'N/A',
      },
    ],
    clinicalInsights: [
      {
        id: 'ci-1-1',
        title: 'Priority 7-Day Outpatient Follow-up Scheduling',
        category: 'followup_care',
        priority: 'critical',
        recommendation: 'Schedule a mandatory face-to-face or telehealth follow-up visit with endocrinology within 7 days of discharge.',
        rationale: 'Patients with severe DKA and high polypharmacy show a 42% reduction in 30-day readmissions when seen within 7 days.',
        suggestedTimeframe: 'Within 7 calendar days',
        isCompleted: false,
      },
      {
        id: 'ci-1-2',
        title: 'Clinical Pharmacist Medication Reconciliation',
        category: 'medication_reconciliation',
        priority: 'high',
        recommendation: 'Conduct a bedside medication teach-back session and simplify insulin regimen before discharge.',
        rationale: 'Discharge regimen includes 18 active medications including high-alert subcutaneous insulin.',
        suggestedTimeframe: 'Pre-discharge (Day 6)',
        isCompleted: false,
      },
      {
        id: 'ci-1-3',
        title: 'Home Health Glycemic Monitoring Referral',
        category: 'monitoring',
        priority: 'high',
        recommendation: 'Order home nursing visits for bi-weekly fasting blood glucose and vital sign assessments.',
        rationale: 'Patient is in age bracket [70-80) with concurrent Chronic Kidney Disease Stage 3.',
        suggestedTimeframe: 'First 14 days post-discharge',
        isCompleted: false,
      },
      {
        id: 'ci-1-4',
        title: 'Diabetic Foot & Renal Function Follow-Up',
        category: 'specialist_referral',
        priority: 'medium',
        recommendation: 'Order repeat serum creatinine, eGFR, and urinalysis panel at 30-day follow-up.',
        rationale: 'Monitors renal clearance in the presence of metformin and ACE-inhibitor therapy.',
        suggestedTimeframe: 'Day 30',
        isCompleted: false,
      },
    ],
  },

  // Patient 2: Beatrice Montgomery (Medium Risk)
  2: {
    patientId: 2,
    patientName: 'Beatrice Montgomery',
    mrn: 'MRN-209381',
    ageGroup: '[60-70)',
    gender: 'Female',
    department: 'Cardiology',
    primaryDiagnosis: 'Congestive Heart Failure, Unspecified (ICD-9: 428.0)',
    readmissionProbability: 0.46,
    riskCategory: 'medium',
    confidenceScore: 0.88,
    predictedReadmissionHorizonDays: 30,
    assessedAt: '2026-09-08T11:15:00Z',
    isSimulated: true,
    dataSource: 'simulated_mock',
    modelInfo: MOCK_MODEL_METADATA,
    riskFactors: [
      {
        id: 'rf-2-1',
        factorName: 'Heart Failure Diagnostic Code (428.0)',
        category: 'clinical',
        impact: 'increase',
        weightPercent: 32,
        description: 'Heart failure is a prominent predictive biomarker for 30-day readmissions.',
        patientValue: 'CHF Stage C',
        benchmarkRange: 'N/A',
      },
      {
        id: 'rf-2-2',
        factorName: 'Moderate Medication Count',
        category: 'medication',
        impact: 'increase',
        weightPercent: 20,
        description: '12 active daily medications including loop diuretics and beta-blockers.',
        patientValue: '12 medications',
        benchmarkRange: '< 9 medications',
      },
      {
        id: 'rf-2-3',
        factorName: 'Controlled Glycemic Stability',
        category: 'clinical',
        impact: 'decrease',
        weightPercent: 22,
        description: 'HbA1c level is within acceptable therapeutic range (6.8%).',
        patientValue: '6.8%',
        benchmarkRange: '< 7.0%',
      },
      {
        id: 'rf-2-4',
        factorName: 'Single Emergency Encounter',
        category: 'utilization',
        impact: 'increase',
        weightPercent: 16,
        description: '1 emergency department visit within the last 6 months.',
        patientValue: '1 ED visit',
        benchmarkRange: '0 visits',
      },
    ],
    clinicalInsights: [
      {
        id: 'ci-2-1',
        title: 'Daily Weight Monitoring Protocol',
        category: 'monitoring',
        priority: 'high',
        recommendation: 'Provide digital weight scale and establish clear parameters for fluid retention reporting (> 3 lbs in 24h).',
        rationale: 'Early detection of volume overload prevents emergency heart failure readmission.',
        suggestedTimeframe: 'Daily starting discharge day',
        isCompleted: false,
      },
      {
        id: 'ci-2-2',
        title: '14-Day Cardiology Clinic Visit',
        category: 'followup_care',
        priority: 'medium',
        recommendation: 'Confirm outpatient cardiology follow-up for diuretic titration and electrolyte check.',
        rationale: 'Assesses renal function following adjustment of furosemide dosage.',
        suggestedTimeframe: 'Day 10 - 14',
        isCompleted: false,
      },
    ],
  },

  // Patient 3: Carlos Mendoza (Low Risk)
  3: {
    patientId: 3,
    patientName: 'Carlos Mendoza',
    mrn: 'MRN-330192',
    ageGroup: '[50-60)',
    gender: 'Male',
    department: 'Cardiology',
    primaryDiagnosis: 'Acute Myocardial Infarction, Anterior Wall (ICD-9: 410.1)',
    readmissionProbability: 0.16,
    riskCategory: 'low',
    confidenceScore: 0.94,
    predictedReadmissionHorizonDays: 30,
    assessedAt: '2026-09-08T09:45:00Z',
    isSimulated: true,
    dataSource: 'simulated_mock',
    modelInfo: MOCK_MODEL_METADATA,
    riskFactors: [
      {
        id: 'rf-3-1',
        factorName: 'Low Prior Healthcare Utilization',
        category: 'utilization',
        impact: 'decrease',
        weightPercent: 36,
        description: 'First hospital admission with zero prior emergency visits.',
        patientValue: '0 prior encounters',
        benchmarkRange: '0 - 1 per year',
      },
      {
        id: 'rf-3-2',
        factorName: 'Successful Revascularization Outcome',
        category: 'clinical',
        impact: 'decrease',
        weightPercent: 30,
        description: 'Uncomplicated coronary intervention with normal post-procedure hemodynamic parameters.',
        patientValue: 'Ejection Fraction: 55%',
        benchmarkRange: '> 50%',
      },
      {
        id: 'rf-3-3',
        factorName: 'Low Polypharmacy Index',
        category: 'medication',
        impact: 'decrease',
        weightPercent: 18,
        description: 'Standard guideline-directed medical therapy with 6 medications.',
        patientValue: '6 medications',
        benchmarkRange: '< 9 medications',
      },
      {
        id: 'rf-3-4',
        factorName: 'Underlying Hyperlipidemia',
        category: 'clinical',
        impact: 'increase',
        weightPercent: 16,
        description: 'Elevated LDL cholesterol requiring high-intensity statin initiation.',
        patientValue: 'LDL: 142 mg/dL',
        benchmarkRange: '< 70 mg/dL',
      },
    ],
    clinicalInsights: [
      {
        id: 'ci-3-1',
        title: 'Cardiac Rehabilitation Enrollment',
        category: 'lifestyle',
        priority: 'medium',
        recommendation: 'Refer patient to Phase II supervised outpatient cardiac rehabilitation program.',
        rationale: 'Structured physical conditioning reduces all-cause cardiovascular re-hospitalization.',
        suggestedTimeframe: 'Enrollment within 21 days',
        isCompleted: false,
      },
      {
        id: 'ci-3-2',
        title: 'Routine 30-Day Follow-up & Statin Adherence',
        category: 'followup_care',
        priority: 'low',
        recommendation: 'Check lipid panel and verify tolerance of dual antiplatelet therapy at 1 month.',
        rationale: 'Ensures adherence to post-PCI antiplatelet regimen.',
        suggestedTimeframe: 'Day 30',
        isCompleted: false,
      },
    ],
  },

  // Patient 4: Dorothy Vance (High Risk)
  4: {
    patientId: 4,
    patientName: 'Dorothy Vance',
    mrn: 'MRN-419204',
    ageGroup: '[70-80)',
    gender: 'Female',
    department: 'Nephrology',
    primaryDiagnosis: 'Chronic Kidney Disease Stage 4 with Fluid Overload (ICD-9: 585.4)',
    readmissionProbability: 0.79,
    riskCategory: 'high',
    confidenceScore: 0.89,
    predictedReadmissionHorizonDays: 30,
    assessedAt: '2026-09-08T12:00:00Z',
    isSimulated: true,
    dataSource: 'simulated_mock',
    modelInfo: MOCK_MODEL_METADATA,
    riskFactors: [
      {
        id: 'rf-4-1',
        factorName: 'End-Stage Renal Disease Risk / CKD Stage 4',
        category: 'clinical',
        impact: 'increase',
        weightPercent: 30,
        description: 'Severe renal impairment with estimated GFR of 22 mL/min/1.73m².',
        patientValue: 'eGFR: 22',
        benchmarkRange: '> 60',
      },
      {
        id: 'rf-4-2',
        factorName: 'Frequent Emergency Department Usage',
        category: 'utilization',
        impact: 'increase',
        weightPercent: 24,
        description: '2 ED presentations in the past 90 days for hyperkalemia and fluid retention.',
        patientValue: '2 ED visits',
        benchmarkRange: '0 visits',
      },
      {
        id: 'rf-4-3',
        factorName: 'Complex Medication Regimen',
        category: 'medication',
        impact: 'increase',
        weightPercent: 20,
        description: '16 scheduled medications with dosage adjustments for renal clearance.',
        patientValue: '16 medications',
        benchmarkRange: '< 9 medications',
      },
      {
        id: 'rf-4-4',
        factorName: 'Age-Associated Frailty',
        category: 'demographic',
        impact: 'increase',
        weightPercent: 16,
        description: 'Patient age bracket [70-80) with mobility assistance required.',
        patientValue: 'Age 76',
        benchmarkRange: 'N/A',
      },
    ],
    clinicalInsights: [
      {
        id: 'ci-4-1',
        title: 'Urgent Nephrology Follow-Up (Within 5 Days)',
        category: 'specialist_referral',
        priority: 'critical',
        recommendation: 'Mandatory clinical review with attending nephrologist within 5 business days for vascular access planning and electrolyte check.',
        rationale: 'CKD Stage 4 patients with recent volume overload carry a high 30-day re-admission trajectory.',
        suggestedTimeframe: 'Within 5 days',
        isCompleted: false,
      },
      {
        id: 'ci-4-2',
        title: 'Dietary Potassium & Sodium Counseling',
        category: 'lifestyle',
        priority: 'high',
        recommendation: 'Refer to clinical renal dietitian for individualized low-potassium, fluid-restricted meal planning.',
        rationale: 'Reduces recurrence of hyperkalemic emergency visits.',
        suggestedTimeframe: 'Prior to discharge',
        isCompleted: false,
      },
    ],
  },
};

/**
 * Dynamic simulated scoring engine for interactive what-if calculations.
 * Allows clinicians to test parameter changes without requiring live ML infrastructure.
 */
export function simulateRiskCalculation(payload: RiskPredictionPayload): PatientRiskAssessment {
  const stayWeight = Math.min(payload.time_in_hospital / 14, 1.0) * 0.25;
  const medsWeight = Math.min(payload.num_medications / 35, 1.0) * 0.25;
  const diagWeight = Math.min(payload.number_diagnoses / 12, 1.0) * 0.20;
  const inpatWeight = Math.min((payload.number_inpatient ?? 0) / 4, 1.0) * 0.20;
  const emergWeight = Math.min((payload.number_emergency ?? 0) / 4, 1.0) * 0.10;

  // Compute calculated raw score clamped between 0.05 and 0.96
  let rawScore = stayWeight + medsWeight + diagWeight + inpatWeight + emergWeight;
  if (payload.change_in_meds) {
    rawScore += 0.08;
  }
  const score = Math.max(0.06, Math.min(0.95, parseFloat(rawScore.toFixed(2))));

  let riskCategory: RiskCategory = 'low';
  if (score >= 0.65) {
    riskCategory = 'high';
  } else if (score >= 0.35) {
    riskCategory = 'medium';
  }

  const riskFactors: RiskFactor[] = [
    {
      id: 'sim-rf-1',
      factorName: 'Inpatient Hospital Stay Duration',
      category: 'history',
      impact: payload.time_in_hospital > 4 ? 'increase' : 'decrease',
      weightPercent: 26,
      description: `${payload.time_in_hospital} days in current admission compared to 4.2-day national baseline.`,
      patientValue: `${payload.time_in_hospital} days`,
      benchmarkRange: '3 - 4 days',
    },
    {
      id: 'sim-rf-2',
      factorName: 'Prescription Medication Load',
      category: 'medication',
      impact: payload.num_medications > 10 ? 'increase' : 'decrease',
      weightPercent: 24,
      description: `${payload.num_medications} active pharmaceuticals prescribed.`,
      patientValue: `${payload.num_medications} meds`,
      benchmarkRange: '< 9 meds',
    },
    {
      id: 'sim-rf-3',
      factorName: 'Multimorbidity Diagnoses Count',
      category: 'clinical',
      impact: payload.number_diagnoses > 5 ? 'increase' : 'decrease',
      weightPercent: 22,
      description: `${payload.number_diagnoses} concurrent ICD-9 diagnostic codes recorded.`,
      patientValue: `${payload.number_diagnoses} diagnoses`,
      benchmarkRange: '1 - 4 diagnoses',
    },
    {
      id: 'sim-rf-4',
      factorName: 'Prior Healthcare Utilization',
      category: 'utilization',
      impact: (payload.number_inpatient ?? 0) > 0 ? 'increase' : 'decrease',
      weightPercent: 18,
      description: `${payload.number_inpatient ?? 0} previous inpatient stays and ${payload.number_emergency ?? 0} emergency visits in the past year.`,
      patientValue: `${(payload.number_inpatient ?? 0) + (payload.number_emergency ?? 0)} visits`,
      benchmarkRange: '0 - 1 per year',
    },
  ];

  const clinicalInsights: ClinicalInsight[] = [];
  if (riskCategory === 'high') {
    clinicalInsights.push({
      id: 'sim-ci-1',
      title: 'High-Risk Discharge Coordination Protocol',
      category: 'followup_care',
      priority: 'critical',
      recommendation: 'Initiate multidisciplinary discharge transition care team and assign dedicated post-discharge nurse navigator.',
      rationale: `Simulated risk score (${Math.round(score * 100)}%) places this encounter in the high readmission tier.`,
      suggestedTimeframe: 'Immediate (Pre-discharge)',
      isCompleted: false,
    });
    clinicalInsights.push({
      id: 'sim-ci-2',
      title: 'Pharmacist-Led Medication Reconciliation',
      category: 'medication_reconciliation',
      priority: 'high',
      recommendation: 'Perform complete comprehensive medication review to reduce polypharmacy and eliminate drug-drug interactions.',
      rationale: `Patient is prescribed ${payload.num_medications} medications.`,
      suggestedTimeframe: 'Within 24 hours of discharge',
      isCompleted: false,
    });
  } else if (riskCategory === 'medium') {
    clinicalInsights.push({
      id: 'sim-ci-3',
      title: 'Standard 14-Day Outpatient Follow-up',
      category: 'followup_care',
      priority: 'medium',
      recommendation: 'Confirm primary care or specialist appointment scheduled within 10-14 days post-discharge.',
      rationale: `Moderate probability of readmission (${Math.round(score * 100)}%) with manageable risk drivers.`,
      suggestedTimeframe: 'Day 10 - 14',
      isCompleted: false,
    });
  } else {
    clinicalInsights.push({
      id: 'sim-ci-4',
      title: 'Routine Post-Discharge Care Plan',
      category: 'followup_care',
      priority: 'low',
      recommendation: 'Standard 30-day primary care follow-up with self-monitoring instructions provided.',
      rationale: `Low readmission risk trajectory (${Math.round(score * 100)}%).`,
      suggestedTimeframe: 'Day 30',
      isCompleted: false,
    });
  }

  return {
    patientId: payload.patient_id,
    patientName: `Patient Record #${payload.patient_id}`,
    mrn: `MRN-${(100000 + payload.patient_id).toString()}`,
    ageGroup: payload.age_group || '[60-70)',
    primaryDiagnosis: 'Clinical Encounter Assessment',
    readmissionProbability: score,
    riskCategory,
    confidenceScore: 0.90,
    predictedReadmissionHorizonDays: 30,
    assessedAt: new Date().toISOString(),
    isSimulated: true,
    dataSource: 'simulated_mock',
    modelInfo: MOCK_MODEL_METADATA,
    riskFactors,
    clinicalInsights,
  };
}
