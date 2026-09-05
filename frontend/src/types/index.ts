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
  created_at?: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
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
}

export interface Admission {
  id: number;
  patient_id: number;
  admission_date: string | null;
  discharge_date: string | null;
  time_in_hospital: number | null;
  admission_type: string | null;
  discharge_disposition: string | null;
  num_medications: number | null;
  num_lab_procedures: number | null;
  number_diagnoses: number | null;
  readmitted: string | null;
}

export interface PatientDetail extends Patient {
  admissions: Admission[];
}

export interface AnonymisedPatient {
  pseudo_id: string;
  age_group: string | null;
  gender: string | null;
  primary_diagnosis: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardSummary {
  scope: 'caseload' | 'hospital';
  total_patients: number;
  total_admissions: number;
  readmissions_within_30_days: number;
  readmission_rate: number;
  average_length_of_stay: number;
}

export interface AgeBandStat {
  age_group: string;
  admissions: number;
  readmissions: number;
  readmission_rate: number;
}

export interface AdmissionTypeStat {
  admission_type: string;
  admissions: number;
  readmissions: number;
  readmission_rate: number;
}

export interface LengthOfStayBucket {
  days: number;
  admissions: number;
}

export interface PopulationHealth {
  cohort_size: number;
  by_gender: { gender: string; patients: number }[];
  by_race: { race: string; patients: number }[];
  by_age_group: AgeBandStat[];
}
