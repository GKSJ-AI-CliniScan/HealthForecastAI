import { apiClient } from '@/api/axios';
import {
  DepartmentAnalyticsResponse,
  HealthcareTrendsResponse,
  HospitalPerformanceResponse,
  MedicationAnalyticsResponse,
  PatientOutcomeAnalyticsResponse,
  TreatmentAnalyticsFilters,
  TreatmentAnalyticsResponse,
} from './analytics.types';

export const analyticsApi = {
  // Treatment Effectiveness Analytics
  getTreatmentAnalytics: async (
    filters?: TreatmentAnalyticsFilters
  ): Promise<TreatmentAnalyticsResponse> => {
    const { data } = await apiClient.get<TreatmentAnalyticsResponse>('/analytics/treatments', {
      params: filters,
    });
    return data;
  },

  // Medication Analytics
  getMedicationAnalytics: async (): Promise<MedicationAnalyticsResponse> => {
    const { data } = await apiClient.get<MedicationAnalyticsResponse>('/analytics/medications');
    return data;
  },

  // Hospital Performance Overview
  getHospitalPerformance: async (): Promise<HospitalPerformanceResponse> => {
    const { data } = await apiClient.get<HospitalPerformanceResponse>(
      '/analytics/hospital-performance'
    );
    return data;
  },

  // Department Analytics Breakdown
  getDepartmentAnalytics: async (): Promise<DepartmentAnalyticsResponse> => {
    const { data } = await apiClient.get<DepartmentAnalyticsResponse>('/analytics/departments');
    return data;
  },

  // Patient Outcome Analytics
  getPatientOutcomeAnalytics: async (
    filters?: TreatmentAnalyticsFilters
  ): Promise<PatientOutcomeAnalyticsResponse> => {
    const { data } = await apiClient.get<PatientOutcomeAnalyticsResponse>(
      '/analytics/patient-outcomes',
      { params: filters }
    );
    return data;
  },

  // Healthcare Trend Monitoring
  getHealthcareTrends: async (params: {
    frequency: 'daily' | 'weekly' | 'monthly';
    start_date?: string;
    end_date?: string;
  }): Promise<HealthcareTrendsResponse> => {
    const { data } = await apiClient.get<HealthcareTrendsResponse>('/analytics/trends', {
      params,
    });
    return data;
  },

  // CSV Data Exports
  exportTreatmentsCsv: async (): Promise<Blob> => {
    const response = await apiClient.get('/analytics/export/treatments', {
      responseType: 'blob',
    });
    return response.data;
  },

  exportOutcomesCsv: async (): Promise<Blob> => {
    const response = await apiClient.get('/analytics/export/outcomes', {
      responseType: 'blob',
    });
    return response.data;
  },
};
