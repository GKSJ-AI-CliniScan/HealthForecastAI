export interface Patient {
  id: string;
  patient_identifier: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
  is_anonymized?: boolean;
}

export interface AnonymizedPatient {
  id: string;
  anonymized_patient_id: string;
  age_group?: string | null;
  gender?: string | null;
  created_at: string;
  is_anonymized: boolean;
}

export interface PatientCreatePayload {
  patient_identifier: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface PatientUpdatePayload {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
}
