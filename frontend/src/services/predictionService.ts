import {
  PatientRiskAssessment,
  RiskPredictionPayload,
  ModelMetadata,
  RiskPredictionApiResponse
} from '@/types'
import {
  MOCK_MODEL_METADATA,
  MOCK_PATIENT_RISK_ASSESSMENTS,
  simulateRiskCalculation
} from './mockPredictionData'
import { apiFetch } from '@/lib/api'

const LATENCY_MS = 200
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function getActiveToken (passedToken?: string): string | null {
  if (passedToken && passedToken !== 'mock-dev-token') return passedToken
  if (typeof window !== 'undefined') {
    const stored =
      sessionStorage.getItem('hf_auth_token') ||
      localStorage.getItem('hf_auth_token')
    if (stored && stored !== 'mock-dev-token') return stored
  }
  return null
}

export const predictionService = {
  /**
   * Fetch complete risk assessment for a specific patient.
   */
  async getPatientRiskAssessment (
    patientId: number,
    token?: string
  ): Promise<PatientRiskAssessment> {
    const activeToken = getActiveToken(token)

    if (activeToken) {
      try {
        const response = await apiFetch<RiskPredictionApiResponse>(
          '/risk/predict',
          {
            method: 'POST',
            body: JSON.stringify({
              patient_id: patientId,
              time_in_hospital: 5,
              num_medications: 14,
              num_lab_procedures: 45,
              number_diagnoses: 8
            })
          },
          activeToken
        )

        const mockTemplate =
          MOCK_PATIENT_RISK_ASSESSMENTS[patientId] ||
          MOCK_PATIENT_RISK_ASSESSMENTS[1]

        return {
          ...mockTemplate,
          patientId: response.patient_id,
          readmissionProbability: response.readmission_probability,
          riskCategory: response.risk_category,
          assessedAt: response.created_at ?? new Date().toISOString(),
          dataSource: 'fastapi_ml_backend'
        }
      } catch (err) {
        console.warn('Live ML prediction failed, using fallback:', err)
      }
    }

    await delay(LATENCY_MS)
    return (
      MOCK_PATIENT_RISK_ASSESSMENTS[patientId] ??
      MOCK_PATIENT_RISK_ASSESSMENTS[1]
    )
  },

  /**
   * Run real-time what-if scenario.
   */
  async calculateWhatIfRisk (
    payload: RiskPredictionPayload
  ): Promise<PatientRiskAssessment> {
    await delay(150)
    return simulateRiskCalculation(payload)
  },

  /**
   * Get active model metadata.
   */
  async getModelMetadata (_token?: string): Promise<ModelMetadata> {
    await delay(LATENCY_MS)
    return MOCK_MODEL_METADATA
  },

  /**
   * Get all assessments.
   */
  async getAllAssessments (): Promise<PatientRiskAssessment[]> {
    await delay(LATENCY_MS)
    return Object.values(MOCK_PATIENT_RISK_ASSESSMENTS)
  }
}
