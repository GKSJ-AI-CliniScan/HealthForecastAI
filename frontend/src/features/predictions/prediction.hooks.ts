import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { predictionApi, PredictionListParams } from './prediction.api';
import { GeneratePredictionPayload } from './prediction.types';

export const usePredictions = (params?: PredictionListParams) => {
  return useQuery({
    queryKey: ['predictions', params],
    queryFn: () => predictionApi.listPredictions(params),
  });
};

export const usePredictionDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['prediction', id],
    queryFn: () => predictionApi.getPrediction(id!),
    enabled: !!id,
  });
};

export const usePatientPredictions = (patientId: string | undefined) => {
  return useQuery({
    queryKey: ['patient-predictions', patientId],
    queryFn: () => predictionApi.getPatientPredictions(patientId!),
    enabled: !!patientId,
  });
};

export const useHighRiskPatients = (params?: { page?: number; page_size?: number; category?: string }) => {
  return useQuery({
    queryKey: ['high-risk-patients', params],
    queryFn: () => predictionApi.listHighRiskPatients(params),
  });
};

export const useRiskDistribution = () => {
  return useQuery({
    queryKey: ['analytics-risk-distribution'],
    queryFn: () => predictionApi.getRiskDistribution(),
    staleTime: 30000,
  });
};

export const useReadmissionTrends = () => {
  return useQuery({
    queryKey: ['analytics-readmission-trends'],
    queryFn: () => predictionApi.getReadmissionTrends(),
    staleTime: 30000,
  });
};

export const usePredictionSummary = () => {
  return useQuery({
    queryKey: ['analytics-prediction-summary'],
    queryFn: () => predictionApi.getPredictionSummary(),
    staleTime: 30000,
  });
};

export const useGeneratePrediction = (patientId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GeneratePredictionPayload) => predictionApi.generatePrediction(payload),
    onSuccess: () => {
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patient-predictions', patientId] });
      }
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['high-risk-patients'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-prediction-summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-risk-distribution'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-readmission-trends'] });
    },
  });
};
