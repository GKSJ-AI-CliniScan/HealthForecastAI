export type Role = 'doctor' | 'hospital_admin' | 'researcher' | 'system_admin';

export type RiskCategory = 'low' | 'medium' | 'high';

export const ROLE_LABELS: Record<Role, string> = {
  doctor: 'Doctor',
  hospital_admin: 'Hospital Administrator',
  researcher: 'Healthcare Researcher',
  system_admin: 'System Administrator',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  doctor: 'Clinical risk assessment, patient readmission prognosis, and active caseload.',
  hospital_admin: 'Facility capacity, hospital-wide readmission rates, and operational oversight.',
  researcher: 'Cohort analytics, de-identified clinical outcomes, and epidemiological research.',
  system_admin: 'Access control, role provisioning, system audit logs, and model governance.',
};

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string | null;
  license_id?: string;
  is_active: boolean;
  avatar_url?: string;
}

export interface CallerIdentity {
  email: string;
  role: Role;
  permissions: string[];
}

export interface SessionUser extends CallerIdentity {
  id: number;
  full_name: string;
  department?: string | null;
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
  description?: string;
}
