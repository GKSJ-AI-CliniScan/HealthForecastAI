import { apiClient } from './axios';
import { PaginatedResponse, Patient, PatientCreatePayload, PatientUpdatePayload } from '@/types';

export interface PatientListParams {
  page?: number;
  page_size?: number;
  search?: string;
  gender?: string;
}

export const patientsApi = {
  listPatients: async (params?: PatientListParams): Promise<PaginatedResponse<Patient>> => {
    const { data } = await apiClient.get<PaginatedResponse<Patient>>('/patients', {
      params,
    });
    return data;
  },

  getPatient: async (id: string): Promise<Patient> => {
    const { data } = await apiClient.get<Patient>(`/patients/${id}`);
    return data;
  },

  createPatient: async (payload: PatientCreatePayload): Promise<Patient> => {
    const { data } = await apiClient.post<Patient>('/patients', payload);
    return data;
  },

  updatePatient: async (id: string, payload: PatientUpdatePayload): Promise<Patient> => {
    const { data } = await apiClient.put<Patient>(`/patients/${id}`, payload);
    return data;
  },

  deletePatient: async (id: string): Promise<void> => {
    await apiClient.delete(`/patients/${id}`);
  },
};
