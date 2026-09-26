import { patientService } from './patientService';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const riskService = {
  getRiskSummary: async () => {
    await delay(300);
    const patients = await patientService.getAllPatients();
    
    const count = patients.length;
    let high = 0;
    let medium = 0;
    let low = 0;
    let sumProb = 0;

    patients.forEach(p => {
      sumProb += (p.readmissionProbability || 0);
      if (p.riskLevel === 'High') high++;
      else if (p.riskLevel === 'Medium') medium++;
      else low++;
    });

    return {
      totalCount: count,
      highRiskCount: high,
      mediumRiskCount: medium,
      lowRiskCount: low,
      averageProbability: count > 0 ? Math.round(sumProb / count) : 0,
      riskDistribution: [
        { name: 'High Risk', nameKey: 'High', value: high, color: '#ef4444' },
        { name: 'Medium Risk', nameKey: 'Medium', value: medium, color: '#f59e0b' },
        { name: 'Low Risk', nameKey: 'Low', value: low, color: '#10b981' }
      ]
    };
  }
};
