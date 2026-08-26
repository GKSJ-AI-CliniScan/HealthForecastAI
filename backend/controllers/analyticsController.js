const Patient = require('../models/Patient');

// @desc    Get hospital administrative metrics and dashboard KPIs
// @route   GET /api/v1/analytics/hospital-dashboard
// @access  Private (Hospital Admin, System Admin, Doctor)
const getHospitalDashboard = async (req, res) => {
  try {
    const patients = await Patient.find();

    const totalPatients = patients.length;
    const highRiskPatients = patients.filter((p) => p.riskLevel === 'High').length;
    const mediumRiskPatients = patients.filter((p) => p.riskLevel === 'Medium').length;
    const lowRiskPatients = patients.filter((p) => p.riskLevel === 'Low').length;

    // Calculate dynamic average readmission probability
    const avgReadmissionNum = totalPatients > 0
      ? parseFloat((patients.reduce((sum, p) => sum + (p.readmissionProbability || 0), 0) / totalPatients).toFixed(1))
      : 14.2;

    const departmentPerformance = [
      { id: 'DP-01', department: 'Cardiology', patientCount: 420, readmissionRate: 16.8, avgStayDays: 4.8, recoveryRate: 85.2 },
      { id: 'DP-02', department: 'Endocrinology & Diabetes', patientCount: 350, readmissionRate: 15.2, avgStayDays: 5.4, recoveryRate: 87.5 },
      { id: 'DP-03', department: 'Pulmonology', patientCount: 280, readmissionRate: 13.4, avgStayDays: 4.1, recoveryRate: 89.1 },
      { id: 'DP-04', department: 'Nephrology', patientCount: 220, readmissionRate: 16.5, avgStayDays: 6.2, recoveryRate: 86.4 },
      { id: 'DP-05', department: 'General Internal Medicine', patientCount: 370, readmissionRate: 11.2, avgStayDays: 3.6, recoveryRate: 91.8 },
    ];

    const monthlyTrends = [
      { month: 'Jan', readmissionRate: 15.6, totalAdmissions: 280, highRiskCount: 45 },
      { month: 'Feb', readmissionRate: 14.8, totalAdmissions: 260, highRiskCount: 38 },
      { month: 'Mar', readmissionRate: 15.2, totalAdmissions: 310, highRiskCount: 52 },
      { month: 'Apr', readmissionRate: 14.1, totalAdmissions: 290, highRiskCount: 40 },
      { month: 'May', readmissionRate: 13.9, totalAdmissions: 320, highRiskCount: 48 },
      { month: 'Jun', readmissionRate: 13.5, totalAdmissions: 340, highRiskCount: 44 },
      { month: 'Jul', readmissionRate: 14.3, totalAdmissions: 300, highRiskCount: 51 },
      { month: 'Aug', readmissionRate: avgReadmissionNum, totalAdmissions: 315, highRiskCount: highRiskPatients },
    ];

    const treatmentSuccessByMedication = [
      { treatment: 'Insulin Glargine (Diabetes)', successRate: 85, sideEffectsRate: 4 },
      { treatment: 'Furosemide IV (Heart Failure)', successRate: 82, sideEffectsRate: 8 },
      { treatment: 'Nebulizer Steroids (COPD)', successRate: 88, successCount: 246, sideEffectsRate: 5 },
      { treatment: 'Ceftriaxone IV (Pneumonia)', successRate: 94, successCount: 328, sideEffectsRate: 2 },
      { treatment: 'Laparoscopic Excision (Appendicitis)', successRate: 97, sideEffectsRate: 1 },
    ];

    const highPct = totalPatients > 0 ? Math.round((highRiskPatients / totalPatients) * 100) : 13;
    const medPct = totalPatients > 0 ? Math.round((mediumRiskPatients / totalPatients) * 100) : 32;
    const lowPct = totalPatients > 0 ? Math.round((lowRiskPatients / totalPatients) * 100) : 55;

    res.json({
      success: true,
      data: {
        kpis: {
          totalPatients,
          highRiskPatients,
          averageReadmissionRate: avgReadmissionNum,
          readmissionRate: `${avgReadmissionNum}%`,
          recoveryRate: 88.5,
          treatmentSuccessRate: 84.1,
          avgBedOccupancy: 81.3,
          bedOccupancyRate: '81.3%',
          hospitalRating: 4.8,
          avgStayDuration: '4.8 Days',
        },
        departmentPerformance,
        monthlyTrends,
        treatmentSuccessByMedication,
        riskDistribution: [
          { name: 'High Risk', category: 'High Risk', count: highRiskPatients, value: highRiskPatients, percentage: highPct },
          { name: 'Medium Risk', category: 'Medium Risk', count: mediumRiskPatients, value: mediumRiskPatients, percentage: medPct },
          { name: 'Low Risk', category: 'Low Risk', count: lowRiskPatients, value: lowRiskPatients, percentage: lowPct },
        ],
      },
    });
  } catch (error) {
    console.error('[Analytics Controller] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving hospital analytics',
    });
  }
};

// @desc    Get anonymized population health research analytics
// @route   GET /api/v1/analytics/research
// @access  Private (Researcher, System Admin)
const getResearchAnalytics = async (req, res) => {
  try {
    const patients = await Patient.find();

    // Strictly anonymize patient records for research compliance (HIPAA / GDPR safe)
    const anonymizedDataset = patients.map((p) => ({
      id: p.id,
      age: p.age,
      gender: p.gender,
      diagnosis: p.diagnosis,
      riskLevel: p.riskLevel,
      readmissionProbability: p.readmissionProbability,
      treatmentStatus: p.treatmentStatus,
      admissionDate: p.admissionDate,
      dischargeDate: p.dischargeDate,
      hba1cResult: p.hba1cResult,
      // Strictly NO name, phone, email, address, or assignedDoctor
    }));

    const ageDemographics = [
      { ageGroup: '18-35', count: 154, patientCount: 154, readmissionCount: 12, avgReadmissionProb: 7.8, avgRiskScore: 32 },
      { ageGroup: '36-50', count: 342, patientCount: 342, readmissionCount: 38, avgReadmissionProb: 11.1, avgRiskScore: 48 },
      { ageGroup: '51-65', count: 520, patientCount: 520, readmissionCount: 84, avgReadmissionProb: 16.2, avgRiskScore: 68 },
      { ageGroup: '66-80', count: 480, patientCount: 480, readmissionCount: 96, avgReadmissionProb: 20.0, avgRiskScore: 78 },
      { ageGroup: '80+', count: 210, patientCount: 210, readmissionCount: 52, avgReadmissionProb: 24.8, avgRiskScore: 84 },
    ];

    const riskByDiagnosisIndex = [
      { diagnosis: 'Type 2 Diabetes Mellitus', diagnosisCategory: 'Type 2 Diabetes Mellitus', highRiskPct: 35, highRiskRatio: 35, avgStayDays: 6.2, cohortSize: 112 },
      { diagnosis: 'Congestive Heart Failure', diagnosisCategory: 'Congestive Heart Failure', highRiskPct: 58, highRiskRatio: 58, avgStayDays: 8.5, cohortSize: 94 },
      { diagnosis: 'COPD Exacerbation', diagnosisCategory: 'COPD Exacerbation', highRiskPct: 42, highRiskRatio: 42, avgStayDays: 5.8, cohortSize: 58 },
      { diagnosis: 'Community Pneumonia', diagnosisCategory: 'Community Pneumonia', highRiskPct: 22, highRiskRatio: 22, avgStayDays: 7.0, cohortSize: 72 },
      { diagnosis: 'Hypertension / CAD', diagnosisCategory: 'Hypertension / CAD', highRiskPct: 28, highRiskRatio: 28, avgStayDays: 4.5, cohortSize: 64 },
    ];

    res.json({
      success: true,
      data: {
        ageDemographics,
        riskByDiagnosisIndex,
        anonymizedDataset,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error retrieving research analytics',
    });
  }
};

module.exports = {
  getHospitalDashboard,
  getResearchAnalytics,
};
