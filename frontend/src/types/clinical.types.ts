export interface MedicalHistory {
  id: string;
  patient_id: string;
  diagnosis?: string | null;
  chronic_conditions?: string | null;
  allergies?: string | null;
  medical_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalHistoryCreatePayload {
  diagnosis?: string;
  chronic_conditions?: string;
  allergies?: string;
  medical_notes?: string;
}

export interface Admission {
  id: string;
  patient_id: string;
  admission_date: string;
  discharge_date?: string | null;
  admission_type?: string | null;
  department?: string | null;
  primary_diagnosis?: string | null;
  length_of_stay?: number | null;
  discharge_disposition?: string | null;
  created_at: string;
}

export interface AdmissionCreatePayload {
  admission_date: string;
  discharge_date?: string;
  admission_type?: string;
  department?: string;
  primary_diagnosis?: string;
  length_of_stay?: number;
  discharge_disposition?: string;
}

export interface Treatment {
  id: string;
  patient_id: string;
  treatment_name: string;
  treatment_type?: string | null;
  start_date: string;
  end_date?: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'DISCONTINUED';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentCreatePayload {
  treatment_name: string;
  treatment_type?: string;
  start_date: string;
  end_date?: string;
  status?: string;
  notes?: string;
}

export interface DoctorPatientAssignment {
  id: string;
  doctor_id: string;
  patient_id: string;
  doctor_name?: string;
  patient_identifier?: string;
  patient_name?: string;
  assigned_at: string;
}
