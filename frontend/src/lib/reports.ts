import type { ReportFilterKey, ReportFormat, ReportType } from '@/types';

export interface ReportTypeOption {
  type: ReportType;
  label: string;
  description: string;
  /** Filter inputs to render. Mirrors backend ALLOWED_FILTERS (schemas/report.py). */
  filters: ReportFilterKey[];
  /** Any one of these grants the data (backend REPORT_PERMISSIONS). */
  permissions: string[];
}

/**
 * The report types the backend can generate.
 *
 * This only decides what the form offers - so a role is never shown a report
 * type or a filter the backend will always reject. The backend still validates
 * every request and authorises every report on its own.
 */
export const REPORT_TYPES: ReportTypeOption[] = [
  {
    type: 'treatment_effectiveness',
    label: 'Treatment effectiveness',
    description: 'Success and recovery per treatment, and effectiveness by department.',
    filters: ['treatment_name', 'department'],
    permissions: ['treatment_report:read', 'treatment_report:read_limited'],
  },
  {
    type: 'patient_outcomes',
    label: 'Patient outcome analytics',
    description: 'Outcome distribution per treatment, monthly outcome trend, discharge outcomes.',
    filters: ['months'],
    permissions: ['hospital_analytics:read'],
  },
  {
    type: 'department_performance',
    label: 'Department performance',
    description: 'Admissions, length of stay and readmission rate per department.',
    filters: ['date_from', 'date_to'],
    permissions: ['hospital_analytics:read'],
  },
  {
    type: 'population_health',
    label: 'Population health',
    description: 'Disease prevalence and demographic distributions (aggregated only).',
    filters: [],
    permissions: ['population_health:read'],
  },
  {
    type: 'risk_distribution',
    label: 'Risk distribution',
    description: 'Latest risk category per patient and the monthly scoring trend.',
    filters: ['months'],
    permissions: ['hospital_analytics:read'],
  },
  {
    type: 'readmission_analytics',
    label: 'Readmission analytics',
    description: 'Headline readmission figures and the monthly readmission trend.',
    filters: ['months'],
    permissions: ['hospital_analytics:read'],
  },
  {
    type: 'research_cohort',
    label: 'Research cohort statistics',
    description: 'Size and demographic breakdown of a filtered, anonymised cohort.',
    filters: ['diagnosis', 'gender', 'age_band', 'date_from', 'date_to'],
    permissions: ['population_health:read'],
  },
];

export const REPORT_FORMATS: { format: ReportFormat; label: string }[] = [
  { format: 'pdf', label: 'PDF' },
  { format: 'xlsx', label: 'Excel (.xlsx)' },
  { format: 'csv', label: 'CSV' },
];

export const FILTER_LABELS: Record<ReportFilterKey, string> = {
  treatment_name: 'Treatment name',
  department: 'Department',
  months: 'Months of history',
  date_from: 'Admitted from',
  date_to: 'Admitted to',
  diagnosis: 'Primary diagnosis',
  gender: 'Gender',
  age_band: 'Age band (e.g. 60-69)',
};

/** Report generation needs analytics:export plus the data permission of the type. */
export function availableReportTypes(permissions: string[]): ReportTypeOption[] {
  if (!permissions.includes('analytics:export')) {
    return [];
  }
  return REPORT_TYPES.filter((option) =>
    option.permissions.some((permission) => permissions.includes(permission)),
  );
}

export function reportTypeLabel(type: ReportType): string {
  return REPORT_TYPES.find((option) => option.type === type)?.label ?? type;
}
