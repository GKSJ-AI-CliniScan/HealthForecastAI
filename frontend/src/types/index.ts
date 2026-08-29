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
}

/** What GET /auth/me returns: resolved from the token, no database lookup. */
export interface CallerIdentity {
  email: string;
  role: Role;
  permissions: string[];
}

/** The session the UI holds: identity plus the display fields from login. */
export interface SessionUser extends CallerIdentity {
  id: number;
  full_name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: User;
}

export interface RoleInfo {
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
  /** Present only on the anonymised research endpoint. */
  cohort_id?: string;
}

export interface Admission {
  id: number;
  admission_date: string | null;
  discharge_date: string | null;
  time_in_hospital: number | null;
  admission_type: string | null;
  discharge_disposition: string | null;
  num_medications: number | null;
  number_diagnoses: number | null;
  readmitted: string | null;
  readmitted_within_30: boolean | null;
}

export interface PatientDetail extends Patient {
  admissions: Admission[];
}

/**
 * Headline dashboard metrics. `scope` reports whether the numbers cover the
 * caller's own caseload or the whole hospital, so the UI can label them
 * honestly rather than implying a doctor is seeing hospital-wide figures.
 */
export interface DashboardStats {
  scope: 'assigned' | 'hospital';
  total_patients: number;
  total_admissions: number;
  readmitted_within_30_days: number;
  readmission_rate_percent: number;
  average_length_of_stay_days: number;
  can_export: boolean;
}

export interface RiskPrediction {
  patient_id: number;
  readmission_probability: number;
  risk_category: RiskCategory;
  model_name: string;
  model_version: string;
}
