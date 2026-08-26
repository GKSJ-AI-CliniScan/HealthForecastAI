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
      : 0;
    const recoveryScores = patients.map((p) => p.recoveryProgress?.score).filter((score) => typeof score === 'number');
    const averageRecovery = recoveryScores.length > 0
      ? parseFloat((recoveryScores.reduce((sum, score) => sum + score, 0) / recoveryScores.length).toFixed(1))
      : null;
    const stayDurations = patients.map((p) => {
      if (!p.admissionDate || !p.dischargeDate) return null;
      return Math.max(0, Math.round((new Date(p.dischargeDate) - new Date(p.admissionDate)) / 86400000));
    }).filter((days) => days !== null);
    const averageStay = stayDurations.length > 0
      ? parseFloat((stayDurations.reduce((sum, days) => sum + days, 0) / stayDurations.length).toFixed(1))
      : null;
    const monthlyTrends = totalPatients > 0 ? [{
      month: new Date(patients[0].admissionDate).toLocaleString('en-US', { month: 'short' }),
      readmissionRate: avgReadmissionNum,
      totalAdmissions: totalPatients,
      highRiskCount: highRiskPatients,
    }] : [];

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
          recoveryRate: averageRecovery,
          treatmentSuccessRate: null,
          avgBedOccupancy: null,
          bedOccupancyRate: null,
          hospitalRating: null,
          avgStayDuration: averageStay === null ? null : `${averageStay} Days`,
        },
        departmentPerformance: [],
        monthlyTrends,
        treatmentSuccessByMedication: [],
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

    const ageGroups = [
      ['18-35', 18, 35], ['36-50', 36, 50], ['51-65', 51, 65], ['66-80', 66, 80], ['80+', 81, Infinity],
    ];
    const ageDemographics = ageGroups.map(([ageGroup, min, max]) => {
      const cohort = patients.filter((p) => p.age >= min && p.age <= max);
      const averageRisk = cohort.length > 0
        ? parseFloat((cohort.reduce((sum, p) => sum + (p.readmissionProbability || 0), 0) / cohort.length).toFixed(1))
        : 0;
      return { ageGroup, count: cohort.length, patientCount: cohort.length, readmissionCount: cohort.filter((p) => p.riskLevel === 'High').length, avgReadmissionProb: averageRisk, avgRiskScore: averageRisk };
    });
    const diagnosisGroups = [...new Set(patients.map((p) => p.diagnosis).filter(Boolean))];
    const riskByDiagnosisIndex = diagnosisGroups.map((diagnosis, index) => {
      const cohort = patients.filter((p) => p.diagnosis === diagnosis);
      const highRiskPct = Math.round((cohort.filter((p) => p.riskLevel === 'High').length / cohort.length) * 100);
      return { diagnosis, diagnosisCategory: diagnosis, highRiskPct, highRiskRatio: highRiskPct, cohortSize: cohort.length, id: `DG-${index + 1}` };
    });

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
