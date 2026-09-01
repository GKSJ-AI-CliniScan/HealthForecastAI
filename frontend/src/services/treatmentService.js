import { mockHospitalAnalytics } from '../data/mockData';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const treatmentService = {
  getTreatmentSummary: async () => {
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
