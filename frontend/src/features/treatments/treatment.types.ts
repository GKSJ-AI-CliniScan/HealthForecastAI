/**
 * Treatment & Medication Feature Types
 */

export interface Treatment {
  id: string;
  patient_id: string;
  treatment_name: string;
  treatment_type?: string | null;
  start_date: string;
  end_date?: string | null;
  status: string;
  outcome?: string | null;
  effectiveness_score?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientTreatmentItem {
  id: string;
  treatment_name: string;
  treatment_type?: string | null;
  start_date: string;
  end_date?: string | null;
  duration_days?: number | null;
  status: string;
  outcome?: string | null;
  effectiveness_score?: number | null;
  notes?: string | null;
}

export interface PatientTreatmentSummary {
  total_treatments: number;
  completed: number;
  average_effectiveness?: number | null;
}

export interface PatientTreatmentAnalysisResponse {
  patient_id: string;
  treatments: PatientTreatmentItem[];
  summary: PatientTreatmentSummary;
}

export interface Medication {
  id: string;
  patient_id: string;
  medication_name: string;
  dosage?: string | null;
  frequency?: string | null;
  start_date: string;
  end_date?: string | null;
  status: string;
  effectiveness_score?: number | null;
  outcome?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientOutcome {
  id: string;
  patient_id: string;
  admission_id?: string | null;
  outcome_status: string;
  outcome_score?: number | null;
  recorded_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
