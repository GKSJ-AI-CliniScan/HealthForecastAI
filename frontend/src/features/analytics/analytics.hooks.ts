import { useQuery, useMutation } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';
import { TreatmentAnalyticsFilters } from './analytics.types';

export const useTreatmentAnalytics = (filters?: TreatmentAnalyticsFilters) => {
  return useQuery({
    queryKey: ['analytics', 'treatments', filters],
    queryFn: () => analyticsApi.getTreatmentAnalytics(filters),
  });
};

export const useMedicationAnalytics = () => {
  return useQuery({
    queryKey: ['analytics', 'medications'],
    queryFn: () => analyticsApi.getMedicationAnalytics(),
  });
};

export const useHospitalPerformance = () => {
  return useQuery({
    queryKey: ['analytics', 'hospital-performance'],
    queryFn: () => analyticsApi.getHospitalPerformance(),
  });
};

export const useDepartmentAnalytics = () => {
  return useQuery({
    queryKey: ['analytics', 'departments'],
    queryFn: () => analyticsApi.getDepartmentAnalytics(),
  });
};

export const usePatientOutcomeAnalytics = (filters?: TreatmentAnalyticsFilters) => {
  return useQuery({
    queryKey: ['analytics', 'patient-outcomes', filters],
    queryFn: () => analyticsApi.getPatientOutcomeAnalytics(filters),
  });
};

export const useHealthcareTrends = (params: {
  frequency: 'daily' | 'weekly' | 'monthly';
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: ['analytics', 'trends', params],
    queryFn: () => analyticsApi.getHealthcareTrends(params),
  });
};

export const useExportTreatments = () => {
  return useMutation({
    mutationFn: () => analyticsApi.exportTreatmentsCsv(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `treatment_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
};

export const useExportOutcomes = () => {
  return useMutation({
    mutationFn: () => analyticsApi.exportOutcomesCsv(),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `outcomes_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
};
