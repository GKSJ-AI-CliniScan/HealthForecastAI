import { RiskCategory } from './auth';

export interface Allergy {
  allergen: string;
  severity?: 'mild' | 'moderate' | 'severe';
  reaction?: string;
}

export interface ChronicCondition {
  condition: string;
  diagnosedYear?: number;
  status?: 'active' | 'managed' | 'resolved';
}

export interface PastSurgery {
  procedureName: string;
  date?: string;
  facility?: string;
}

export interface MedicalHistory {
  bloodType?: string;
  blood_type?: string;
  chronic_conditions: string[];
  allergies: string[];
  past_surgeries: string[];
  family_history: string[];
  primary_diagnosis?: string;
  secondary_diagnoses?: string[];
  smoking_status?: string;
  smokingStatus?: 'never' | 'former' | 'current';
  alcoholUse?: 'none' | 'occasional' | 'regular';
  alcohol_use?: string;
  bmi?: number;
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
  num_lab_procedures?: number;
  num_procedures?: number;
  primary_diagnosis?: string | null;
  attending_physician?: string | null;
  department?: string | null;
  readmitted: string | null;
  readmitted_within_30: boolean | null;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribed_date?: string;
  startDate?: string;
  status: 'active' | 'completed' | 'discontinued';
}

export interface LabResult {
  test_name?: string;
  testName?: string;
  value: string;
  unit?: string;
  reference_range?: string;
  referenceRange?: string;
  status: 'normal' | 'abnormal' | 'critical';
  date: string;
}

export interface VitalSignRecord {
  recordedAt: string;
  bloodPressure: string;
  heartRateBpm: number;
  respiratoryRate: number;
  temperatureF: number;
  oxygenSaturationPercent: number;
}

export interface ProcedureRecord {
  procedureName: string;
  performedDate: string;
  provider: string;
  notes?: string;
}

export interface TreatmentInfo {
  current_medications: Medication[];
  lab_results: LabResult[];
  care_plan: string[];
  dietary_restrictions?: string[];
  follow_up_instructions?: string;
  vitals?: VitalSignRecord[];
  procedures?: ProcedureRecord[];
}

export interface Patient {
  id: number;
  medical_record_number: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  full_name?: string;
  age_group: string | null;
  gender: string | null;
  race?: string | null;
  primary_diagnosis: string;
  assigned_doctor_id: number | null;
  assigned_doctor_name?: string | null;
  department?: string | null;
  admission_status?: 'admitted' | 'discharged' | 'under_observation';
  risk_category?: RiskCategory;
  readmission_risk_score?: number;
  last_admission_date?: string | null;
  contact_number?: string | null;
  phone?: string | null;
  email?: string | null;
  cohort_id?: string;
  admissions?: Admission[];
}

export interface PatientDetail extends Patient {
  contact_number?: string | null;
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  medical_history: MedicalHistory;
  admissions: Admission[];
  treatment: TreatmentInfo;
}

export interface PatientFilterOptions {
  searchQuery?: string;
  riskCategory?: RiskCategory | 'all';
  gender?: string | 'all';
  ageGroup?: string | 'all';
  department?: string | 'all';
  status?: string | 'all';
  scope?: 'all' | 'assigned';
  assignedDoctorId?: number;
}

export type PatientFilterParams = PatientFilterOptions;
