import { apiClient } from './axios';
import {
  AuditLogItem,
  DashboardMetrics,
  DatasetSummary,
  DoctorPatientAssignment,
  PaginatedResponse,
  RoleItem,
} from '@/types';

export const adminApi = {
  listRoles: async (): Promise<RoleItem[]> => {
    const { data } = await apiClient.get<RoleItem[]>('/admin/roles');
    return data;
  },

  listAuditLogs: async (page: number = 1, pageSize: number = 15): Promise<PaginatedResponse<AuditLogItem>> => {
    const { data } = await apiClient.get<PaginatedResponse<AuditLogItem>>('/admin/audit-logs', {
      params: { page, page_size: pageSize },
    });
    return data;
  },

  getDatasetSummary: async (): Promise<DatasetSummary> => {
    const { data } = await apiClient.get<DatasetSummary>('/admin/dataset/summary');
    return data;
  },

  getDashboardStats: async (): Promise<DashboardMetrics> => {
    const { data } = await apiClient.get<DashboardMetrics>('/admin/dashboard-stats');
    return data;
  },

  listAssignments: async (): Promise<DoctorPatientAssignment[]> => {
    const { data } = await apiClient.get<DoctorPatientAssignment[]>('/assignments');
    return data;
  },

  createAssignment: async (doctorId: string, patientId: string): Promise<DoctorPatientAssignment> => {
    const { data } = await apiClient.post<DoctorPatientAssignment>('/assignments', {
      doctor_id: doctorId,
      patient_id: patientId,
    });
    return data;
  },

  deleteAssignment: async (assignmentId: string): Promise<void> => {
    await apiClient.delete(`/assignments/${assignmentId}`);
  },
};
