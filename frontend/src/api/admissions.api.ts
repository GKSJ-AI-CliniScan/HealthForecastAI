import { apiClient } from './axios';
import { Admission, AdmissionCreatePayload } from '@/types';

export const admissionsApi = {
  getPatientAdmissions: async (patientId: string): Promise<Admission[]> => {
    const { data } = await apiClient.get<Admission[]>(`/patients/${patientId}/admissions`);
    return data;
  },

  createAdmission: async (patientId: string, payload: AdmissionCreatePayload): Promise<Admission> => {
    const { data } = await apiClient.post<Admission>(`/patients/${patientId}/admissions`, payload);
    return data;
  },

  updateAdmission: async (id: string, payload: Partial<AdmissionCreatePayload>): Promise<Admission> => {
    const { data } = await apiClient.put<Admission>(`/admissions/${id}`, payload);
    return data;
  },

  deleteAdmission: async (id: string): Promise<void> => {
    await apiClient.delete(`/admissions/${id}`);
  },
};
