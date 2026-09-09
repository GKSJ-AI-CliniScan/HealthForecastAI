import {
  PatientRiskAssessment,
  RiskPredictionPayload,
  ModelMetadata,
  RiskPredictionApiResponse,
} from '@/types';
import {
  MOCK_MODEL_METADATA,
  MOCK_PATIENT_RISK_ASSESSMENTS,
  simulateRiskCalculation,
} from './mockPredictionData';
import { apiFetch } from '@/lib/api';

const LATENCY_MS = 200;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Prediction Service Layer
 *
 * Provides unified interface for patient risk scoring, contributing risk factors,
 * and clinical insights.
 *
 * Architecture:
 * - Structured to integrate with FastAPI ML endpoints (/api/v1/risk/*)
 * - Currently operates in demonstrative mode with clearly labeled simulated/mock clinical data
 * - Always explicitly indicates data source ('simulated_mock' vs 'fastapi_ml_backend')
 */
export const predictionService = {
  /**
   * Fetch complete risk assessment for a specific patient.
   */
  async getPatientRiskAssessment(
    patientId: number,
    token?: string,
  ): Promise<PatientRiskAssessment> {
    await delay(LATENCY_MS);

    // If backend JWT is provided and backend risk endpoint is live, try real backend
    if (token && token !== 'mock-dev-token') {
      try {
        const response = await apiFetch<RiskPredictionApiResponse>(
          '/risk/predict',
          {
            method: 'POST',
            body: JSON.stringify({
              patient_id: patientId,
              time_in_hospital: 4,
              num_medications: 12,
              num_lab_procedures: 45,
              number_diagnoses: 6,
            }),
          },
          token,
        );

        const mockTemplate = MOCK_PATIENT_RISK_ASSESSMENTS[patientId] || MOCK_PATIENT_RISK_ASSESSMENTS[1];

        return {
          ...mockTemplate,
          patientId: response.patient_id,
          readmissionProbability: response.readmission_probability,
          riskCategory: response.risk_category,
          assessedAt: response.created_at || new Date().toISOString(),
          isSimulated: false,
          dataSource: 'fastapi_ml_backend',
          modelInfo: {
            ...mockTemplate.modelInfo,
            modelName: response.model_name,
            modelVersion: response.model_version,
          },
        };
      } catch {
        // Gracefully fall through to simulated demonstration data
      }
    }

    // Default to structured simulated clinical data for Milestone 2 UI workflow
    const assessment =
      MOCK_PATIENT_RISK_ASSESSMENTS[patientId] ??
      simulateRiskCalculation({
        patient_id: patientId,
        time_in_hospital: 5,
        num_medications: 14,
        num_lab_procedures: 48,
        number_diagnoses: 6,
        number_inpatient: 1,
        number_emergency: 0,
      });

    return JSON.parse(JSON.stringify(assessment));
  },

  /**
   * Calculate simulated what-if risk score based on interactive clinician inputs.
   */
  async calculateWhatIfRisk(
    payload: RiskPredictionPayload,
  ): Promise<PatientRiskAssessment> {
    await delay(150);
    return simulateRiskCalculation(payload);
  },

  /**
   * Fetch active model metadata.
   */
  async getModelMetadata(): Promise<ModelMetadata> {
    await delay(LATENCY_MS);
    return { ...MOCK_MODEL_METADATA };
  },

  /**
   * Fetch all preset demo patient risk assessments for the triage list.
   */
  async getAllAssessments(): Promise<PatientRiskAssessment[]> {
    await delay(LATENCY_MS);
    return Object.values(MOCK_PATIENT_RISK_ASSESSMENTS);
  },
};
