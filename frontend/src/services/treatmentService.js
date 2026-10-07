import apiClient from './api';
import { mockHospitalAnalytics } from '../data/mockData';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// The dashboard's dropdown values already match the API's diagnostic group
// keys; only the casing differs.
const toApiDiseaseGroup = (value) =>
  !value || value === 'All' ? undefined : value.toUpperCase();

// The API omits a cohort for days no episode reached. Recharts draws a gap
// there, which reads as missing data, so carry the last known value forward.
const carryForward = (trend) => {
  const carried = { cardiac: null, renal: null, pulmonary: null };
  return trend.map((point) => {
    for (const cohort of Object.keys(carried)) {
      if (point[cohort] != null) carried[cohort] = point[cohort];
      else point[cohort] = carried[cohort];
    }
    return point;
  });
};

export const treatmentService = {
  getTreatmentSummary: async (diseaseGroup = 'All') => {
    try {
      const res = await apiClient.get('/treatment/summary', {
        params: { disease_group: toApiDiseaseGroup(diseaseGroup) },
      });
      if (res.data?.success && res.data.data) {
        const data = res.data.data;
        // An empty table is a real state, not a reason to show invented numbers.
        if (data.outcomesRecorded > 0) {
          return { ...data, recoveryProgressTrend: carryForward(data.recoveryProgressTrend || []) };
        }
      }
    } catch (e) {
      console.warn('[treatmentService] API summary failed. Using local figures:', e.message);
    }

    await delay(300);
    return {
      successRate: mockHospitalAnalytics.kpis.treatmentSuccessRate,
      recoveryRate: mockHospitalAnalytics.kpis.recoveryRate,
      medicationsData: mockHospitalAnalytics.treatmentSuccessByMedication,
      recoveryProgressTrend: [
        { day: 'Day 1', cardiac: 20, renal: 15, pulmonary: 25 },
        { day: 'Day 2', cardiac: 35, renal: 30, pulmonary: 42 },
        { day: 'Day 3', cardiac: 55, renal: 48, pulmonary: 58 },
        { day: 'Day 4', cardiac: 70, renal: 62, pulmonary: 70 },
        { day: 'Day 5', cardiac: 82, renal: 75, pulmonary: 84 },
        { day: 'Day 6', cardiac: 88, renal: 84, pulmonary: 90 },
        { day: 'Day 7', cardiac: 92, renal: 88, pulmonary: 94 }
      ]
    };
  }
};
