import { apiClient } from '@/api/axios';
import {
  GeneratePredictionPayload,
  HighRiskPatientListResponse,
  Prediction,
  PredictionListResponse,
  PredictionSummaryResponse,
  ReadmissionTrendsResponse,
  RiskDistributionResponse,
} from './prediction.types';

export interface PredictionListParams {
  page?: number;
  page_size?: number;
  risk_category?: string;
  patient_id?: string;
}

export const predictionApi = {
  // Generate readmission prediction
  generatePrediction: async (payload: GeneratePredictionPayload): Promise<Prediction> => {
    const { data } = await apiClient.post<Prediction>('/predictions/readmission', payload);
    return data;
  },

  // List predictions
  listPredictions: async (params?: PredictionListParams): Promise<PredictionListResponse> => {
    const { data } = await apiClient.get<PredictionListResponse>('/predictions', { params });
    return data;
  },

  // Single prediction
  getPrediction: async (id: string): Promise<Prediction> => {
    const { data } = await apiClient.get<Prediction>(`/predictions/${id}`);
    return data;
  },

  // Patient predictions
  getPatientPredictions: async (patientId: string): Promise<Prediction[]> => {
    const { data } = await apiClient.get<Prediction[]>(`/patients/${patientId}/predictions`);
    return data;
  },

  // High-risk patients
  listHighRiskPatients: async (params?: {
    page?: number;
    page_size?: number;
    category?: string;
  }): Promise<HighRiskPatientListResponse> => {
    const { data } = await apiClient.get<HighRiskPatientListResponse>('/patients/high-risk', {
      params,
    });
    return data;
  },

  // Analytics
  getRiskDistribution: async (): Promise<RiskDistributionResponse> => {
    const { data } = await apiClient.get<RiskDistributionResponse>('/analytics/risk-distribution');
    return data;
  },

  getReadmissionTrends: async (): Promise<ReadmissionTrendsResponse> => {
    const { data } = await apiClient.get<ReadmissionTrendsResponse>('/analytics/readmission-trends');
    return data;
  },

  getPredictionSummary: async (): Promise<PredictionSummaryResponse> => {
    const { data } = await apiClient.get<PredictionSummaryResponse>('/analytics/prediction-summary');
    return data;
  },
};
