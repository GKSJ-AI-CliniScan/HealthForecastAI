import { apiClient } from './axios';
import { MedicalHistory, MedicalHistoryCreatePayload } from '@/types';

export const medicalHistoryApi = {
  getPatientMedicalHistory: async (patientId: string): Promise<MedicalHistory[]> => {
    const { data } = await apiClient.get<MedicalHistory[]>(`/patients/${patientId}/medical-history`);
    return data;
  },

  createMedicalHistory: async (patientId: string, payload: MedicalHistoryCreatePayload): Promise<MedicalHistory> => {
    const { data } = await apiClient.post<MedicalHistory>(`/patients/${patientId}/medical-history`, payload);
    return data;
  },

  updateMedicalHistory: async (id: string, payload: Partial<MedicalHistoryCreatePayload>): Promise<MedicalHistory> => {
    const { data } = await apiClient.put<MedicalHistory>(`/medical-history/${id}`, payload);
    return data;
  },

  deleteMedicalHistory: async (id: string): Promise<void> => {
    await apiClient.delete(`/medical-history/${id}`);
  },
};
