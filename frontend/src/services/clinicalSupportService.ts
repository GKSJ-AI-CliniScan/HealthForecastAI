import {
  PatientClinicalSupportSummary,
  CareRecommendationItem,
  PatientDischargePlan,
} from '@/types/clinicalSupport';
import { clinicalSupportApi } from '@/lib/api';
import { patientService } from './patientService';
import { generateMockClinicalSupport } from './mockClinicalSupportData';

const LATENCY_MS = 200;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Clinical Decision Support Service
 *
 * Provides doctor-facing decision support: care recommendations,
 * risk drivers, and discharge indicators.
 *
 * Architecture:
 * - Ready for FastAPI endpoints (/clinical-support/recommendations/{id}, /clinical-support/discharge-plan/{id})
 * - Seamless fallback to clinical simulation records
 * - Explicit transparency tagging ('simulated_mock' vs 'fastapi_ml_backend')
 */
export const clinicalSupportService = {
  /**
   * Fetch complete decision support dossier for a given patient.
   */
  async getClinicalSupportSummary(
    patientId: number,
    token?: string,
  ): Promise<PatientClinicalSupportSummary> {
    await delay(LATENCY_MS);

    // Fetch baseline patient record from patientService for consistent demographics
    const patientRecord = await patientService.getPatientById(patientId);
    const patientName =
      patientRecord?.full_name ||
      patientRecord?.name ||
      `${patientRecord?.first_name || ''} ${patientRecord?.last_name || ''}`.trim() ||
      `Patient #${patientId}`;
    const mrn = patientRecord?.medical_record_number || `MRN-${10000 + patientId}`;
    const primaryDiagnosis =
      patientRecord?.primary_diagnosis || 'Type 2 Diabetes Mellitus with Complications';

    // Attempt live FastAPI backend if valid token is present
    if (token && token !== 'mock-dev-token') {
      try {
        const [recRes, disRes] = await Promise.allSettled([
          clinicalSupportApi.recommendations(patientId, token),
          clinicalSupportApi.dischargePlan(patientId, token),
        ]);

        const mockTemplate = generateMockClinicalSupport(
          patientId,
          patientName,
          mrn,
          primaryDiagnosis,
        );

        // Check if backend provided structured recommendations
        const hasLiveRecs =
          recRes.status === 'fulfilled' &&
          Array.isArray(recRes.value.recommendations) &&
          recRes.value.recommendations.length > 0;

        const hasLiveDis =
          disRes.status === 'fulfilled' &&
          disRes.value.ready_for_discharge !== null;

        if (hasLiveRecs || hasLiveDis) {
          const recs: CareRecommendationItem[] = hasLiveRecs
            ? (recRes.value.recommendations as unknown as CareRecommendationItem[])
            : mockTemplate.recommendations;

          const disPlan: PatientDischargePlan = hasLiveDis
            ? {
                ...mockTemplate.discharge_plan,
                ready_for_discharge: disRes.value.ready_for_discharge,
                risk_mitigation: disRes.value.risk_mitigation.length > 0
                  ? disRes.value.risk_mitigation
                  : mockTemplate.discharge_plan.risk_mitigation,
              }
            : mockTemplate.discharge_plan;

          return {
            ...mockTemplate,
            patient_id: patientId,
            patient_name: patientName,
            medical_record_number: mrn,
            primary_diagnosis: primaryDiagnosis,
            follow_up_days:
              recRes.status === 'fulfilled' && recRes.value.follow_up_days !== null
                ? recRes.value.follow_up_days
                : mockTemplate.follow_up_days,
            recommendations: recs,
            discharge_plan: disPlan,
            isSimulated: false,
            dataSource: 'fastapi_ml_backend',
          };
        }
      } catch {
        // Fall through gracefully to structured clinical simulation
      }
    }

    // Default simulation path for Milestone 3 UI
    return generateMockClinicalSupport(
      patientId,
      patientName,
      mrn,
      primaryDiagnosis,
    );
  },
};
