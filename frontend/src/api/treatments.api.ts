import { apiClient } from './axios';
import { Treatment, TreatmentCreatePayload } from '@/types';

export const treatmentsApi = {
  getPatientTreatments: async (patientId: string): Promise<Treatment[]> => {
    const { data } = await apiClient.get<Treatment[]>(`/patients/${patientId}/treatments`);
    return data;
  },

  createTreatment: async (patientId: string, payload: TreatmentCreatePayload): Promise<Treatment> => {
    const { data } = await apiClient.post<Treatment>(`/patients/${patientId}/treatments`, payload);
    return data;
  },

  updateTreatment: async (id: string, payload: Partial<TreatmentCreatePayload>): Promise<Treatment> => {
    const { data } = await apiClient.put<Treatment>(`/treatments/${id}`, payload);
    return data;
  },

  deleteTreatment: async (id: string): Promise<void> => {
    await apiClient.delete(`/treatments/${id}`);
  },
};
