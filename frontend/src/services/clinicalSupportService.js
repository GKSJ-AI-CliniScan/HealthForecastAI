import apiClient from './api';

const unwrap = (data) => data?.data ?? data;

// The API stores the four pathway blocks in snake_case; the pages read them as
// camelCase, same as the rest of the client models.
const toClientInsights = (raw) =>
  raw
    ? {
        riskMitigation: raw.risk_mitigation,
        careRecommendations: raw.care_recommendations,
        followUpPlanning: raw.follow_up_planning,
        dischargeRecommendations: raw.discharge_recommendations,
        generatedAt: raw.generated_at,
      }
    : null;

const toClientInsightRow = (item) => ({
  patientId: item.patient_id,
  medicalRecordNumber: item.medical_record_number,
  name: item.name ?? null,
  ageGroup: item.age_group,
  gender: item.gender,
  primaryDiagnosis: item.primary_diagnosis,
  modelScored: item.model_scored,
  riskCategory: item.risk_category,
  readmissionProbability: item.readmission_probability,
  modelVersion: item.model_version,
  scoredAt: item.scored_at,
  insights: toClientInsights(item.insights),
});

// Generated pathways carry the insight block plus the plain-text recommendations
// the scoring endpoints return alongside it.
const toClientGenerated = (payload) => ({
  patientId: payload.patient_id,
  riskCategory: payload.risk_category ?? null,
  readmissionProbability: payload.readmission_probability ?? null,
  modelScored: payload.model_scored,
  persisted: payload.persisted,
  followUpDays: payload.follow_up_days ?? null,
  recommendations: payload.recommendations ?? [],
  insights: toClientInsights(payload.clinical_insights),
});

export const clinicalSupportService = {
  // One request for the whole hub page: the backend folds the cohort, each
  // patient's newest score and any saved insights into a single query.
  getCohortInsights: async ({ limit = 200, offset = 0 } = {}) => {
    const res = await apiClient.get('/clinical-support/insights', {
      params: { limit, offset },
    });
    const payload = unwrap(res.data);
    return {
      items: (payload.items ?? []).map(toClientInsightRow),
      total: payload.total ?? 0,
      model: payload.model ?? { loaded: false },
    };
  },

  getPatientInsights: async (patientId) => {
    const res = await apiClient.get(`/clinical-support/insights/${patientId}`);
    const payload = unwrap(res.data);
    return { ...toClientInsightRow(payload), model: payload.model ?? { loaded: false } };
  },

  // Derive the pathway blocks and save them onto the newest prediction row.
  // Without a prediction there is nothing to save against, so `persisted` comes
  // back false and the text is display-only.
  generateInsights: async (patientId) => {
    const res = await apiClient.get(`/clinical-support/recommendations/${patientId}`, {
      params: { persist: true },
    });
    return toClientGenerated(unwrap(res.data));
  },
};
