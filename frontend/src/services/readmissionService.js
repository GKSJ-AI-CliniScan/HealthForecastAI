import { mockHospitalAnalytics } from '../data/mockData';
import { patientService } from './patientService';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const readmissionService = {
  getForecastingMetrics: async () => {
    await delay(300);
    const patients = await patientService.getAllPatients();
    
    // Compute readmotion probability for high risk
    const highRiskPatients = patients.filter(p => p.riskLevel === 'High');
    
    return {
      trends: mockHospitalAnalytics.monthlyTrends,
      recentRate: mockHospitalAnalytics.kpis.averageReadmissionRate,
      highRiskCount: highRiskPatients.length,
      predictedReadmissions: Math.round(highRiskPatients.length * 0.75 + (patients.length - highRiskPatients.length) * 0.15)
    };
  }
};
