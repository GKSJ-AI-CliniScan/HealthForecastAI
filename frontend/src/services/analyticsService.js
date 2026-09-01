import apiClient from './api';
import { mockHospitalAnalytics, mockResearchAnalytics } from '../data/mockData';
import { patientService } from './patientService';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const analyticsService = {
  getHospitalDashboardData: async () => {
    try {
      const res = await apiClient.get('/analytics/hospital-dashboard');
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn('[analyticsService] API hospital dashboard failed. Using computed local analytics:', e.message);
    }

    await delay(300);
    const patients = await patientService.getAllPatients();
    
    // Dynamically calculate numbers based on current active patients database
    const highRisk = patients.filter(p => p.riskLevel === 'High').length;
    
    return {
      kpis: {
        ...mockHospitalAnalytics.kpis,
        totalPatients: patients.length,
        highRiskPatients: highRisk
      },
      departmentPerformance: mockHospitalAnalytics.departmentPerformance,
      monthlyTrends: mockHospitalAnalytics.monthlyTrends,
      riskDistribution: [
        { name: 'High Risk', count: highRisk },
        { name: 'Medium Risk', count: patients.filter(p => p.riskLevel === 'Medium').length },
        { name: 'Low Risk', count: patients.filter(p => p.riskLevel === 'Low').length }
      ]
    };
  },

  getResearchData: async () => {
    try {
      const res = await apiClient.get('/analytics/research');
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      console.warn('[analyticsService] API research data failed. Using local anonymized cohort generator:', e.message);
    }

    await delay(300);
    
    // Researcher view - strict anonymization
    const patients = await patientService.getAllPatients();
    const anonymizedList = patients.map(p => ({
      id: p.id,
      age: p.age,
      gender: p.gender,
      diagnosis: p.diagnosis,
      riskLevel: p.riskLevel,
      readmissionProbability: p.readmissionProbability,
      treatmentStatus: p.treatmentStatus,
      admissionDate: p.admissionDate,
      dischargeDate: p.dischargeDate
      // strictly NO name, phone, email, address, or assigned doctor
    }));

    return {
      ageDemographics: mockResearchAnalytics.anonymizedAggregatedData,
      riskByDiagnosisIndex: mockResearchAnalytics.populationRiskByDiagnosis,
      anonymizedDataset: anonymizedList
    };
  },

  exportReport: async (reportType, format = 'csv') => {
    await delay(600); // Simulate report compiling
    
    let csvContent = "";
    if (reportType === 'readmission') {
      csvContent = "Month,ReadmissionRate,TotalAdmissions,HighRiskCount\n" +
        mockHospitalAnalytics.monthlyTrends.map(t => `${t.month},${t.readmissionRate}%,${t.totalAdmissions},${t.highRiskCount}`).join("\n");
    } else if (reportType === 'department') {
      csvContent = "Department,ReadmissionRate,PatientCount,RecoveryRate\n" +
        mockHospitalAnalytics.departmentPerformance.map(d => `${d.department},${d.readmissionRate}%,${d.patientCount},${d.recoveryRate}%`).join("\n");
    } else {
      csvContent = "Metric,Value\n" +
        Object.entries(mockHospitalAnalytics.kpis).map(([k, v]) => `${k},${v}`).join("\n");
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `HealthForecast_${reportType}_report_${new Date().toISOString().slice(0,10)}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
};
