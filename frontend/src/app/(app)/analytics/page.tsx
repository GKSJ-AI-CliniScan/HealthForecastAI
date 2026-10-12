'use client';

import { useState } from 'react';
import { RateBarChart } from '@/components/charts/RateBarChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { KpiCard } from '@/components/ui/KpiCard';
import { ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import type {
  AdmissionTypeStat,
  AgeBandStat,
  DashboardSummary,
  DepartmentPerformanceStat,
  EarlyWarningAlert,
  HospitalQualityKPIs,
  LengthOfStayBucket,
  PatientOutcomeRecord,
  RecoveryTrendPoint,
  TreatmentEffectivenessSummary,
  TrendDataPoint,
} from '@/types';

// Department clinical performance benchmarks
const DEPARTMENT_PERFORMANCE: DepartmentPerformanceStat[] = [
  {
    department: 'Endocrinology & Metabolic Care',
    total_beds: 75,
    active_patients: 68,
    occupancy_rate: 0.907,
    average_los: 4.1,
    readmission_rate: 0.082,
    target_readmission_rate: 0.085,
    recovery_rate: 0.914,
    patient_satisfaction: 4.8,
    protocol_compliance: 0.965,
    preventable_readmissions_cost: 142000,
  },
  {
    department: 'Cardiology & Vascular Health',
    total_beds: 95,
    active_patients: 86,
    occupancy_rate: 0.905,
    average_los: 4.8,
    readmission_rate: 0.138,
    target_readmission_rate: 0.115,
    recovery_rate: 0.882,
    patient_satisfaction: 4.6,
    protocol_compliance: 0.942,
    preventable_readmissions_cost: 385000,
  },
  {
    department: 'Pulmonary & Respiratory Disease',
    total_beds: 60,
    active_patients: 51,
    occupancy_rate: 0.850,
    average_los: 5.2,
    readmission_rate: 0.146,
    target_readmission_rate: 0.120,
    recovery_rate: 0.865,
    patient_satisfaction: 4.5,
    protocol_compliance: 0.931,
    preventable_readmissions_cost: 290000,
  },
  {
    department: 'Nephrology & Renal Medicine',
    total_beds: 50,
    active_patients: 44,
    occupancy_rate: 0.880,
    average_los: 4.6,
    readmission_rate: 0.112,
    target_readmission_rate: 0.105,
    recovery_rate: 0.891,
    patient_satisfaction: 4.7,
    protocol_compliance: 0.958,
    preventable_readmissions_cost: 195000,
  },
  {
    department: 'Level-1 Emergency & Trauma',
    total_beds: 110,
    active_patients: 98,
    occupancy_rate: 0.891,
    average_los: 2.9,
    readmission_rate: 0.154,
    target_readmission_rate: 0.130,
    recovery_rate: 0.842,
    patient_satisfaction: 4.3,
    protocol_compliance: 0.918,
    preventable_readmissions_cost: 460000,
  },
  {
    department: 'General & Minimally Invasive Surgery',
    total_beds: 60,
    active_patients: 48,
    occupancy_rate: 0.800,
    average_los: 3.8,
    readmission_rate: 0.071,
    target_readmission_rate: 0.075,
    recovery_rate: 0.936,
    patient_satisfaction: 4.9,
    protocol_compliance: 0.982,
    preventable_readmissions_cost: 98000,
  },
];

const HOSPITAL_QUALITY_KPIS: HospitalQualityKPIs = {
  overall_readmission_rate: 0.142,
  cms_national_benchmark: 0.120,
  hospital_wide_recovery_rate: 0.884,
  average_length_of_stay: 4.3,
  alos_target: 4.8,
  bed_turnover_rate: 0.821,
  clinical_protocol_compliance: 0.947,
  projected_annual_cost_savings: 1240000,
  cms_penalty_risk_tier: 'Moderate',
  quality_star_rating: 4.5,
};

// Longitudinal Trend & SPC Data Points (12 Months)
const LONGITUDINAL_TREND_SERIES: TrendDataPoint[] = [
  { period: 'Oct 2025', readmission_rate: 0.158, moving_average: 0.158, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 890 },
  { period: 'Nov 2025', readmission_rate: 0.152, moving_average: 0.155, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 920 },
  { period: 'Dec 2025', readmission_rate: 0.164, moving_average: 0.158, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 980 },
  { period: 'Jan 2026', readmission_rate: 0.159, moving_average: 0.158, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 1040 },
  { period: 'Feb 2026', readmission_rate: 0.148, moving_average: 0.156, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 960 },
  { period: 'Mar 2026', readmission_rate: 0.144, moving_average: 0.153, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 1020 },
  { period: 'Apr 2026', readmission_rate: 0.139, moving_average: 0.150, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 990 },
  { period: 'May 2026', readmission_rate: 0.135, moving_average: 0.147, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 1010 },
  { period: 'Jun 2026', readmission_rate: 0.131, moving_average: 0.144, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 1050 },
  { period: 'Jul 2026', readmission_rate: 0.128, moving_average: 0.141, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 1080 },
  { period: 'Aug 2026', readmission_rate: 0.124, moving_average: 0.138, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 1110 },
  { period: 'Sep 2026', readmission_rate: 0.120, moving_average: 0.135, upper_control_limit: 0.175, lower_control_limit: 0.105, admissions_volume: 1140 },
];

const EARLY_WARNING_ALERTS: EarlyWarningAlert[] = [
  {
    id: 'ALT-1092',
    timestamp: 'Today, 09:15 AM',
    department: 'Cardiology',
    severity: 'critical',
    title: 'Post-Discharge 30d Readmission Surge in Heart Failure Cohort',
    description: 'Heart failure readmissions in age group [70-80) increased by 2.6% over the last 14 days.',
    metric_name: '30-Day Readmission',
    current_value: '16.4%',
    baseline_value: '13.8%',
    recommended_action: 'Trigger mandatory 48-hour telehealth cardiology nurse outreach for newly discharged CHF patients.',
  },
  {
    id: 'ALT-1088',
    timestamp: 'Yesterday, 04:30 PM',
    department: 'Pulmonary',
    severity: 'warning',
    title: 'Short Stay (<2 Days) Readmission Risk Anomaly',
    description: 'Patients discharged within 48 hours for acute respiratory exacerbation showed 1.8x higher readmission probability.',
    metric_name: 'Short Stay Readmissions',
    current_value: '18.2%',
    baseline_value: '11.5%',
    recommended_action: 'Enforce clinical readiness checklist sign-off before discharging pulmonary patients under 48h.',
  },
  {
    id: 'ALT-1081',
    timestamp: '2 days ago',
    department: 'Endocrinology',
    severity: 'info',
    title: 'GLP-1 RA Regimen Efficacy Milestone Reached',
    description: 'Metabolic care readmissions dropped below 5.0% following hospital-wide rollout of incretin protocols.',
    metric_name: 'Regimen Efficacy',
    current_value: '4.8%',
    baseline_value: '8.2%',
    recommended_action: 'Expand protocol eligibility to borderline diabetic cohorts with cardiovascular comorbidities.',
  },
];

const SAMPLE_PATIENT_OUTCOMES: PatientOutcomeRecord[] = [
  { id: 101, medical_record_number: 'MRN-849201', age_group: '[60-70)', gender: 'Female', primary_diagnosis: 'Diabetes with complications', treatment_regimen: 'GLP-1 RA Protocol', dosage_adjusted: true, recovery_score: 92, outcome_category: 'Full Recovery', time_in_hospital: 3, num_medications: 8, discharge_status: 'Discharged Home', follow_up_completed: true },
  { id: 102, medical_record_number: 'MRN-391824', age_group: '[70-80)', gender: 'Male', primary_diagnosis: 'Congestive Heart Failure', treatment_regimen: 'Cardiovascular Protection', dosage_adjusted: true, recovery_score: 86, outcome_category: 'Partial Improvement', time_in_hospital: 5, num_medications: 14, discharge_status: 'Home Health Care', follow_up_completed: true },
  { id: 103, medical_record_number: 'MRN-572091', age_group: '[80-90)', gender: 'Female', primary_diagnosis: 'Pulmonary Disease / COPD', treatment_regimen: 'Standard Bronchodilator', dosage_adjusted: false, recovery_score: 64, outcome_category: 'Readmitted (<30d)', time_in_hospital: 2, num_medications: 18, discharge_status: 'Discharged Home', follow_up_completed: false },
  { id: 104, medical_record_number: 'MRN-194820', age_group: '[50-60)', gender: 'Male', primary_diagnosis: 'Hypertensive Emergency', treatment_regimen: 'ACEi + Statin Regimen', dosage_adjusted: true, recovery_score: 95, outcome_category: 'Full Recovery', time_in_hospital: 2, num_medications: 6, discharge_status: 'Discharged Home', follow_up_completed: true },
  { id: 105, medical_record_number: 'MRN-673910', age_group: '[60-70)', gender: 'Male', primary_diagnosis: 'Chronic Kidney Disease', treatment_regimen: 'SGLT2i Renal Protocol', dosage_adjusted: true, recovery_score: 88, outcome_category: 'Full Recovery', time_in_hospital: 4, num_medications: 11, discharge_status: 'Discharged Home', follow_up_completed: true },
  { id: 106, medical_record_number: 'MRN-442819', age_group: '[70-80)', gender: 'Female', primary_diagnosis: 'Severe Inpatient DKA', treatment_regimen: 'Insulin Basal-Bolus', dosage_adjusted: false, recovery_score: 68, outcome_category: 'Readmitted (<30d)', time_in_hospital: 6, num_medications: 16, discharge_status: 'Home Health Care', follow_up_completed: false },
  { id: 107, medical_record_number: 'MRN-881923', age_group: '[40-50)', gender: 'Male', primary_diagnosis: 'First-Line Type 2 Diabetes', treatment_regimen: 'Metformin Monotherapy', dosage_adjusted: true, recovery_score: 91, outcome_category: 'Full Recovery', time_in_hospital: 3, num_medications: 5, discharge_status: 'Discharged Home', follow_up_completed: true },
  { id: 108, medical_record_number: 'MRN-920184', age_group: '[70-80)', gender: 'Male', primary_diagnosis: 'Diabetic Nephropathy', treatment_regimen: 'Dual Therapy (Sulfonylurea)', dosage_adjusted: false, recovery_score: 74, outcome_category: 'Chronic Care', time_in_hospital: 5, num_medications: 13, discharge_status: 'Discharged Home', follow_up_completed: true },
];

type AnalyticsTab = 'overview' | 'performance' | 'outcomes' | 'trends' | 'simulator';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');

  // Existing API hooks
  const summary = useApi<DashboardSummary>('/analytics/summary');
  const byAge = useApi<AgeBandStat[]>('/analytics/readmissions/by-age');
  const byType = useApi<AdmissionTypeStat[]>('/analytics/readmissions/by-admission-type');
  const stays = useApi<LengthOfStayBucket[]>('/analytics/length-of-stay');
  const treatments = useApi<TreatmentEffectivenessSummary[]>('/treatment');
  const recovery = useApi<RecoveryTrendPoint[]>('/treatment/recovery-trends');

  // Outcomes Filter State
  const [outcomeFilter, setOutcomeFilter] = useState('All');
  const [outcomeSearch, setOutcomeSearch] = useState('');
  const [selectedOutcomeRecord, setSelectedOutcomeRecord] = useState<PatientOutcomeRecord | null>(null);

  // What-If Simulator Levers
  const [simAdherenceDelta, setSimAdherenceDelta] = useState(15); // +15%
  const [simTelehealthRate, setSimTelehealthRate] = useState(80); // 80% coverage
  const [simCutoffThreshold, setSimCutoffThreshold] = useState(0.12); // t = 0.12

  const error = summary.error ?? byAge.error ?? byType.error ?? stays.error ?? treatments.error;
  const loading = summary.loading || byAge.loading || byType.loading || stays.loading;

  if (error) return <ErrorBlock message={error} />;
  if (loading) return <Loading />;

  // Dynamic simulation calculations
  const baselineReadmissionRate = HOSPITAL_QUALITY_KPIS.overall_readmission_rate;
  const adherenceBenefit = (simAdherenceDelta / 100) * 0.08 * baselineReadmissionRate;
  const telehealthBenefit = (simTelehealthRate / 100) * 0.12 * baselineReadmissionRate;
  const thresholdBenefit = simCutoffThreshold <= 0.1 ? 0.008 : 0.002;

  const simulatedReadmissionRate = Math.max(
    0.05,
    baselineReadmissionRate - adherenceBenefit - telehealthBenefit - thresholdBenefit
  );

  const baselinePatients = summary.data?.total_patients || 1420;
  const simulatedReadmissionsCount = Math.round(baselinePatients * simulatedReadmissionRate);
  const baselineReadmissionsCount = Math.round(baselinePatients * baselineReadmissionRate);
  const readmissionsAvoided = Math.max(0, baselineReadmissionsCount - simulatedReadmissionsCount);
  const bedDaysSaved = readmissionsAvoided * (summary.data?.average_length_of_stay || 4.3);
  const costSavings = readmissionsAvoided * 11500; // ~$11.5k per avoided readmission

  // Filtered outcomes
  const filteredOutcomes = SAMPLE_PATIENT_OUTCOMES.filter((item) => {
    const matchCat = outcomeFilter === 'All' || item.outcome_category === outcomeFilter;
    const matchSearch =
      item.medical_record_number.toLowerCase().includes(outcomeSearch.toLowerCase()) ||
      item.primary_diagnosis.toLowerCase().includes(outcomeSearch.toLowerCase()) ||
      item.treatment_regimen.toLowerCase().includes(outcomeSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <header className="border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-md bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white uppercase tracking-wider">
                Milestone 3: Healthcare Analytics & Intelligence
              </span>
              <span className="inline-block rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Hospital Quality Star Rating: ★ 4.5 / 5.0
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Hospital Operations & Clinical Analytics Suite
            </h1>
            <p className="muted mt-1 text-sm">
              Cross-departmental performance benchmarks, patient outcome analytics, longitudinal trend monitoring & predictive forecasting
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
          {[
            { id: 'overview', label: 'Hospital Overview', icon: '🏥' },
            { id: 'performance', label: 'Hospital Performance Dashboard', icon: '📊' },
            { id: 'outcomes', label: 'Patient Outcome Analytics', icon: '🎯' },
            { id: 'trends', label: 'Trend Monitoring & Early Warning', icon: '📈' },
            { id: 'simulator', label: 'What-If Scenario Simulator', icon: '🎛️' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AnalyticsTab)}
              className="flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-xs sm:text-sm font-medium transition"
              style={{
                background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* TAB 1: HOSPITAL OVERVIEW (Preserving & Enhancing Existing Visuals) */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {summary.data ? (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total Inpatient Encounters" value={summary.data.total_patients.toLocaleString()} />
              <KpiCard label="Active Admissions" value={summary.data.total_admissions.toLocaleString()} />
              <KpiCard
                label="30-Day Readmissions"
                value={summary.data.readmissions_within_30_days.toLocaleString()}
                tone="warn"
              />
              <KpiCard
                label="Average Length of Stay"
                value={`${summary.data.average_length_of_stay} days`}
                hint="Target: ≤ 4.8 days"
              />
            </section>
          ) : null}

          {/* Treatment Effectiveness Summary Table */}
          {treatments.data && treatments.data.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Treatment Effectiveness & Recovery Outcomes</h2>
              <p className="muted text-sm mb-2">
                Comparative analysis of treatment regimens, recovery scores, and observed 30-day readmission rates.
              </p>
              <div className="table-wrap">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="th">Treatment Regimen</th>
                      <th className="th">Patients Treated</th>
                      <th className="th">Avg Recovery Score</th>
                      <th className="th">30-day Readmission Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatments.data.map((item) => (
                      <tr key={item.treatment_name}>
                        <td className="td font-medium">{item.treatment_name}</td>
                        <td className="td">{item.patients_treated.toLocaleString()}</td>
                        <td className="td font-semibold text-emerald-700">{item.average_recovery_score.toFixed(1)}/100</td>
                        <td className="td">{(item.readmission_rate * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* Recovery Trends Chart */}
          {recovery.data && recovery.data.length > 0 ? (
            <section className="card">
              <h2 className="text-lg font-semibold">Weekly Patient Recovery Score Trend</h2>
              <p className="muted mb-4 mt-1 text-sm">
                Tracking post-treatment recovery score improvements across weekly milestones.
              </p>
              <RateBarChart
                data={recovery.data as unknown as Record<string, unknown>[]}
                xKey="week"
                yKey="average_recovery_score"
              />
            </section>
          ) : null}

          <section className="card">
            <h2 className="text-lg font-semibold">Readmission rate by age band</h2>
            <p className="muted mb-4 mt-1 text-sm">
              Readmission risk rises steadily with age - the clearest single signal in this dataset.
            </p>
            {byAge.data ? (
              <RateBarChart
                data={byAge.data as unknown as Record<string, unknown>[]}
                xKey="age_group"
                yKey="readmission_rate"
                asPercent
              />
            ) : null}
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold">Readmission rate by admission type</h2>
            <p className="muted mb-4 mt-1 text-sm">
              How the patient arrived, and how often they came back within 30 days.
            </p>
            {byType.data ? (
              <RateBarChart
                data={byType.data as unknown as Record<string, unknown>[]}
                xKey="admission_type"
                yKey="readmission_rate"
                asPercent
              />
            ) : null}
          </section>

          <section className="card">
            <h2 className="text-lg font-semibold">Length of stay distribution</h2>
            <p className="muted mb-4 mt-1 text-sm">Admissions by number of days in hospital.</p>
            {stays.data ? (
              <RateBarChart
                data={stays.data as unknown as Record<string, unknown>[]}
                xKey="days"
                yKey="admissions"
              />
            ) : null}
          </section>

          {byType.data ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Admission types in detail</h2>
              <div className="table-wrap">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="th">Admission type</th>
                      <th className="th">Admissions</th>
                      <th className="th">30-day readmissions</th>
                      <th className="th">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byType.data.map((row) => (
                      <tr key={row.admission_type}>
                        <td className="td font-medium">{row.admission_type}</td>
                        <td className="td">{row.admissions.toLocaleString()}</td>
                        <td className="td">{row.readmissions.toLocaleString()}</td>
                        <td className="td">{(row.readmission_rate * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      )}

      {/* TAB 2: HOSPITAL PERFORMANCE & QUALITY DASHBOARD */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Executive Hospital Performance & Quality Dashboard</h2>
            <p className="muted text-xs">
              CMS National Benchmarks, Departmental Scorecards, Clinical Quality Metrics, and Financial Risk Exposure
            </p>
          </div>

          {/* Primary Operations KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Overall Readmission Rate"
              value={`${(HOSPITAL_QUALITY_KPIS.overall_readmission_rate * 100).toFixed(1)}%`}
              hint="CMS National Target: 12.0%"
              tone="warn"
            />
            <KpiCard
              label="Hospital Recovery Rate"
              value={`${(HOSPITAL_QUALITY_KPIS.hospital_wide_recovery_rate * 100).toFixed(1)}%`}
              hint="Clinical stability at discharge"
              tone="good"
            />
            <KpiCard
              label="Bed Turnover & Occupancy"
              value={`${(HOSPITAL_QUALITY_KPIS.bed_turnover_rate * 100).toFixed(1)}%`}
              hint="350 Active Beds / 450 Capacity"
            />
            <KpiCard
              label="Annual Cost Savings Projected"
              value={`$${(HOSPITAL_QUALITY_KPIS.projected_annual_cost_savings / 1000000).toFixed(2)}M`}
              hint="Via readmission avoidance"
              tone="good"
            />
          </div>

          {/* Departmental Performance Matrix */}
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-semibold text-base">Departmental Clinical Quality & Readmission Scorecard</h3>
                <p className="muted text-xs">Benchmarking all 6 major hospital wards against target readmission rates and ALOS</p>
              </div>
              <span className="rounded bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                6 Active Wards Audited
              </span>
            </div>

            <div className="table-wrap">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="th">Department / Ward</th>
                    <th className="th">Beds / Patients</th>
                    <th className="th">Occupancy</th>
                    <th className="th">Avg Stay (ALOS)</th>
                    <th className="th">Readmission Rate</th>
                    <th className="th">Target Rate</th>
                    <th className="th">Recovery Rate</th>
                    <th className="th">Compliance</th>
                    <th className="th">Preventable Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENT_PERFORMANCE.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-surface-muted/50 transition">
                      <td className="td font-semibold text-foreground">{dept.department}</td>
                      <td className="td">{dept.active_patients} / {dept.total_beds}</td>
                      <td className="td font-medium">{(dept.occupancy_rate * 100).toFixed(0)}%</td>
                      <td className="td">{dept.average_los}d</td>
                      <td className="td font-bold">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            dept.readmission_rate <= dept.target_readmission_rate
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {(dept.readmission_rate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="td text-muted">{(dept.target_readmission_rate * 100).toFixed(1)}%</td>
                      <td className="td font-semibold text-emerald-600">{(dept.recovery_rate * 100).toFixed(1)}%</td>
                      <td className="td">{(dept.protocol_compliance * 100).toFixed(1)}%</td>
                      <td className="td text-rose-600 font-medium">${dept.preventable_readmissions_cost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="card space-y-3">
              <h3 className="font-semibold text-sm">Departmental Readmission Rate Comparison vs Target</h3>
              <RateBarChart
                data={DEPARTMENT_PERFORMANCE.map((d) => ({
                  name: d.department.split(' ')[0],
                  actual: d.readmission_rate,
                  target: d.target_readmission_rate,
                }))}
                xKey="name"
                yKey="actual"
                asPercent
                height={260}
                barColor="#dc2626"
                secondaryBar={{ key: 'target', name: 'Target Rate', color: '#10b981' }}
              />
            </div>

            <div className="card space-y-3">
              <h3 className="font-semibold text-sm">Departmental Protocol Compliance & Quality Index</h3>
              <RateBarChart
                data={DEPARTMENT_PERFORMANCE.map((d) => ({
                  name: d.department.split(' ')[0],
                  compliance: d.protocol_compliance,
                }))}
                xKey="name"
                yKey="compliance"
                asPercent
                height={260}
                barColor="#2563eb"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PATIENT OUTCOME ANALYTICS */}
      {activeTab === 'outcomes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Multi-Dimensional Patient Outcome Explorer</h2>
              <p className="muted text-xs">
                Comprehensive classification of post-discharge clinical status and individual recovery trajectories
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search MRN or diagnosis..."
                className="input text-xs"
                style={{ width: 220 }}
                value={outcomeSearch}
                onChange={(e) => setOutcomeSearch(e.target.value)}
              />
              <select
                className="input text-xs"
                style={{ width: 180 }}
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
              >
                <option value="All">All Outcome Categories</option>
                <option value="Full Recovery">Full Recovery (Score ≥ 85)</option>
                <option value="Partial Improvement">Partial Improvement (70-84)</option>
                <option value="Readmitted (<30d)">Readmitted (&lt;30d)</option>
                <option value="Chronic Care">Chronic Care Maintenance</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="card text-center space-y-1 bg-emerald-500/10 border-emerald-500/30">
              <span className="muted text-xs font-semibold uppercase">Full Recovery</span>
              <p className="text-2xl font-bold text-emerald-600">62.5%</p>
              <span className="muted text-[11px]">Score ≥ 85 · No Readmission</span>
            </div>
            <div className="card text-center space-y-1 bg-blue-500/10 border-blue-500/30">
              <span className="muted text-xs font-semibold uppercase">Partial Improvement</span>
              <p className="text-2xl font-bold text-blue-600">23.3%</p>
              <span className="muted text-[11px]">Score 70-84 · Monitored</span>
            </div>
            <div className="card text-center space-y-1 bg-rose-500/10 border-rose-500/30">
              <span className="muted text-xs font-semibold uppercase">30-Day Readmissions</span>
              <p className="text-2xl font-bold text-rose-600">14.2%</p>
              <span className="muted text-[11px]">Relapse within 30 days</span>
            </div>
            <div className="card text-center space-y-1 bg-purple-500/10 border-purple-500/30">
              <span className="muted text-xs font-semibold uppercase">Follow-Up Completion</span>
              <p className="text-2xl font-bold text-purple-600">91.8%</p>
              <span className="muted text-[11px]">Telehealth / In-Clinic Done</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="th">MRN</th>
                  <th className="th">Age Band</th>
                  <th className="th">Gender</th>
                  <th className="th">Primary Diagnosis</th>
                  <th className="th">Prescribed Regimen</th>
                  <th className="th">Dosage Titration</th>
                  <th className="th">Recovery Score</th>
                  <th className="th">Clinical Outcome Category</th>
                  <th className="th">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutcomes.map((patient) => (
                  <tr key={patient.id} className="hover:bg-surface-muted/50 transition">
                    <td className="td font-mono font-semibold">{patient.medical_record_number}</td>
                    <td className="td">{patient.age_group}</td>
                    <td className="td">{patient.gender}</td>
                    <td className="td">{patient.primary_diagnosis}</td>
                    <td className="td font-medium text-foreground">{patient.treatment_regimen}</td>
                    <td className="td">
                      {patient.dosage_adjusted ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Adjusted (&apos;Ch&apos;)
                        </span>
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                          Unchanged (&apos;No&apos;)
                        </span>
                      )}
                    </td>

                    <td className="td font-bold text-blue-600">{patient.recovery_score}/100</td>
                    <td className="td">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          patient.outcome_category === 'Full Recovery'
                            ? 'bg-emerald-100 text-emerald-800'
                            : patient.outcome_category === 'Partial Improvement'
                            ? 'bg-blue-100 text-blue-800'
                            : patient.outcome_category === 'Readmitted (<30d)'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {patient.outcome_category}
                      </span>
                    </td>
                    <td className="td">
                      <button
                        type="button"
                        onClick={() => setSelectedOutcomeRecord(patient)}
                        className="btn-ghost text-[11px] py-1 px-2 font-semibold"
                      >
                        View Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Individual Outcome Report Card Modal */}
          {selectedOutcomeRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="card w-full max-w-lg space-y-4 bg-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <span className="text-xs font-mono muted">PATIENT OUTCOME REPORT CARD</span>
                    <h3 className="text-lg font-bold">{selectedOutcomeRecord.medical_record_number}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOutcomeRecord(null)}
                    className="btn-ghost text-xs"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg p-2.5 bg-surface-muted">
                    <span className="muted block">Demographics</span>
                    <span className="font-semibold">{selectedOutcomeRecord.age_group} · {selectedOutcomeRecord.gender}</span>
                  </div>
                  <div className="rounded-lg p-2.5 bg-surface-muted">
                    <span className="muted block">Primary Diagnosis</span>
                    <span className="font-semibold">{selectedOutcomeRecord.primary_diagnosis}</span>
                  </div>
                  <div className="rounded-lg p-2.5 bg-surface-muted">
                    <span className="muted block">Prescribed Regimen</span>
                    <span className="font-semibold">{selectedOutcomeRecord.treatment_regimen}</span>
                  </div>
                  <div className="rounded-lg p-2.5 bg-surface-muted">
                    <span className="muted block">Final Recovery Score</span>
                    <span className="font-bold text-emerald-600 text-base">{selectedOutcomeRecord.recovery_score} / 100</span>
                  </div>
                  <div className="rounded-lg p-2.5 bg-surface-muted">
                    <span className="muted block">Length of Stay</span>
                    <span className="font-semibold">{selectedOutcomeRecord.time_in_hospital} Days</span>
                  </div>
                  <div className="rounded-lg p-2.5 bg-surface-muted">
                    <span className="muted block">Follow-Up Status</span>
                    <span className="font-semibold text-emerald-600">
                      {selectedOutcomeRecord.follow_up_completed ? '✓ Completed' : '⚠ Pending Call'}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-surface space-y-1 text-xs">
                  <span className="font-semibold block">Discharge Care Plan & Risk Mitigation:</span>
                  <p className="muted">• 30-day medication supply confirmed with patient and family caregiver.</p>
                  <p className="muted">• Self-monitoring blood glucose log assigned with weekly telemedicine review.</p>
                  <p className="muted">• 24/7 direct clinical triage hotline provided for acute symptom escalation.</p>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn w-full text-xs font-semibold"
                >
                  🖨️ Print Individual Outcome Summary
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TREND MONITORING & EARLY WARNING */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Healthcare Trend Monitoring & Early Warning Surveillance Hub</h2>
            <p className="muted text-xs">
              Statistical Process Control (SPC) longitudinal readmission charts, control boundaries, and automated clinical anomaly alerts
            </p>
          </div>

          {/* SPC Trend Line Chart */}
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-semibold text-base">Longitudinal 30-Day Readmission Trend vs Statistical Control Limits</h3>
                <p className="muted text-xs">12-Month moving average with Upper Control Limit (UCL) & Lower Control Limit (LCL)</p>
              </div>
              <span className="rounded bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                Trending Downward (-3.8% Delta)
              </span>
            </div>

            <TrendLineChart
              data={LONGITUDINAL_TREND_SERIES as unknown as Record<string, unknown>[]}
              xKey="period"
              asPercent

              height={320}
              targetLine={{ value: 0.12, label: 'CMS National Benchmark (12.0%)' }}
              series={[
                { key: 'readmission_rate', name: 'Observed Monthly Readmission Rate', color: '#dc2626', strokeWidth: 2.5 },
                { key: 'moving_average', name: '3-Month Moving Average', color: '#2563eb', strokeWidth: 2 },
                { key: 'upper_control_limit', name: 'Upper Control Limit (UCL)', color: '#f59e0b', strokeDasharray: '4 4', strokeWidth: 1.5 },
                { key: 'lower_control_limit', name: 'Lower Control Limit (LCL)', color: '#10b981', strokeDasharray: '4 4', strokeWidth: 1.5 },
              ]}
            />
          </div>

          {/* Early Warning Alert Cards */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Active Clinical Early Warning Alerts</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {EARLY_WARNING_ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className={`card space-y-3 border-l-4 ${
                    alert.severity === 'critical'
                      ? 'border-l-rose-600 bg-rose-500/5'
                      : alert.severity === 'warning'
                      ? 'border-l-amber-500 bg-amber-500/5'
                      : 'border-l-blue-500 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] muted">{alert.id} · {alert.department}</span>
                    <span className="text-[10px] muted">{alert.timestamp}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs leading-snug">{alert.title}</h4>
                    <p className="muted text-[11px] mt-1">{alert.description}</p>
                  </div>

                  <div className="rounded p-2 bg-surface-muted text-[11px] flex justify-between">
                    <span>Current: <strong className="text-rose-600">{alert.current_value}</strong></span>
                    <span>Baseline: <strong className="muted">{alert.baseline_value}</strong></span>
                  </div>

                  <div className="text-[11px] bg-surface p-2 rounded border" style={{ borderColor: 'var(--border)' }}>
                    <span className="font-semibold text-blue-600 block">Recommended Action:</span>
                    <span>{alert.recommended_action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: WHAT-IF SCENARIO SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Interactive What-If Healthcare Optimization Simulator</h2>
            <p className="muted text-xs">
              Simulate the hospital-wide operational and financial impact of clinical intervention policies
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Levers Card */}
            <div className="card space-y-5 lg:col-span-1">
              <h3 className="font-semibold text-sm border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                Policy Levers & Interventions
              </h3>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Medication Adherence Improvement</span>
                  <span className="text-blue-600">+{simAdherenceDelta}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  className="w-full accent-blue-600"
                  value={simAdherenceDelta}
                  onChange={(e) => setSimAdherenceDelta(Number(e.target.value))}
                />
                <p className="muted text-[11px] mt-1">Post-discharge digital adherence tracking and refill automation</p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>High-Risk 7-Day Telehealth Coverage</span>
                  <span className="text-emerald-600">{simTelehealthRate}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  className="w-full accent-emerald-600"
                  value={simTelehealthRate}
                  onChange={(e) => setSimTelehealthRate(Number(e.target.value))}
                />
                <p className="muted text-[11px] mt-1">Mandatory virtual check-in within 7 days of discharge</p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Model Decision Cutoff (t)</span>
                  <span className="text-purple-600">{simCutoffThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0.06"
                  max="0.25"
                  step="0.01"
                  className="w-full accent-purple-600"
                  value={simCutoffThreshold}
                  onChange={(e) => setSimCutoffThreshold(Number(e.target.value))}
                />
                <p className="muted text-[11px] mt-1">Tuning the review sensitivity threshold for clinical decision support</p>
              </div>
            </div>

            {/* Projected Impact Output */}
            <div className="card space-y-6 lg:col-span-2">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h3 className="font-bold text-base">Projected Operational & Quality Outcomes</h3>
                  <p className="muted text-xs">Simulated on active inpatient cohort ({baselinePatients} patients)</p>
                </div>
                <span className="rounded bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  Forecast Model Active
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border p-4 bg-surface-muted">
                  <span className="muted block text-xs">Simulated Readmission Rate</span>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                    {(simulatedReadmissionRate * 100).toFixed(1)}%
                  </p>
                  <span className="text-xs text-muted block mt-1">
                    Baseline: {(baselineReadmissionRate * 100).toFixed(1)}% (
                    <strong className="text-emerald-600">
                      -{((baselineReadmissionRate - simulatedReadmissionRate) * 100).toFixed(1)}%
                    </strong>
                    )
                  </span>
                </div>

                <div className="rounded-xl border p-4 bg-surface-muted">
                  <span className="muted block text-xs">Avoided Readmissions</span>
                  <p className="text-3xl font-extrabold text-blue-600 mt-1">
                    {readmissionsAvoided} <span className="text-sm text-muted">Patients</span>
                  </p>
                  <span className="text-xs text-muted block mt-1">
                    Over next 12-month horizon
                  </span>
                </div>

                <div className="rounded-xl border p-4 bg-surface-muted">
                  <span className="muted block text-xs">Projected Cost Savings</span>
                  <p className="text-3xl font-extrabold text-purple-600 mt-1">
                    ${(costSavings / 1000).toFixed(0)}k
                  </p>
                  <span className="text-xs text-muted block mt-1">
                    {bedDaysSaved.toFixed(0)} Inpatient Bed Days Saved
                  </span>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-surface space-y-2 text-xs">
                <h4 className="font-semibold text-foreground">Executive Policy Synthesis:</h4>
                <p className="muted leading-relaxed">
                  By increasing medication adherence by <strong>{simAdherenceDelta}%</strong> and maintaining <strong>{simTelehealthRate}%</strong> telehealth follow-up coverage, St. Jude Medical Center meets CMS national standards, preventing <strong>{readmissionsAvoided} avoidable readmissions</strong> and preserving <strong>${(costSavings / 1000).toFixed(0)},000</strong> in operational resources.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
