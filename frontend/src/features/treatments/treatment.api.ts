import { apiClient } from '@/api/axios';
import {
  Medication,
  PatientOutcome,
  PatientTreatmentAnalysisResponse,
} from './treatment.types';
import { PatientRecoveryResponse } from '../analytics/analytics.types';

export const treatmentApi = {
  // Patient Treatment Analysis
  getPatientTreatmentAnalysis: async (
    patientId: string
  ): Promise<PatientTreatmentAnalysisResponse> => {
    const { data } = await apiClient.get<PatientTreatmentAnalysisResponse>(
      `/patients/${patientId}/treatment-analysis`
    );
    return data;
  },

  // Patient Medications CRUD
  getPatientMedications: async (patientId: string): Promise<Medication[]> => {
    const { data } = await apiClient.get<Medication[]>(`/patients/${patientId}/medications`);
    return data;
  },

  createMedication: async (
    patientId: string,
    payload: Partial<Medication>
  ): Promise<Medication> => {
    const { data } = await apiClient.post<Medication>(
      `/patients/${patientId}/medications`,
      payload
    );
    return data;
  },

  updateMedication: async (
    medicationId: string,
    payload: Partial<Medication>
  ): Promise<Medication> => {
    const { data } = await apiClient.put<Medication>(`/medications/${medicationId}`, payload);
    return data;
  },

  deleteMedication: async (medicationId: string): Promise<void> => {
    await apiClient.delete(`/medications/${medicationId}`);
  },

  // Patient Recovery Flow
  getPatientRecovery: async (patientId: string): Promise<PatientRecoveryResponse> => {
    const { data } = await apiClient.get<PatientRecoveryResponse>(
      `/patients/${patientId}/recovery`
    );
    return data;
  },

  // Patient Outcomes
  getPatientOutcomes: async (patientId: string): Promise<PatientOutcome[]> => {
    const { data } = await apiClient.get<PatientOutcome[]>(`/patients/${patientId}/outcomes`);
    return data;
  },

  createPatientOutcome: async (
    patientId: string,
    payload: Partial<PatientOutcome>
  ): Promise<PatientOutcome> => {
    const { data } = await apiClient.post<PatientOutcome>(
      `/patients/${patientId}/outcomes`,
      payload
    );
    return data;
  },
};
