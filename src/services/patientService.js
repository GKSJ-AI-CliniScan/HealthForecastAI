import { mockPatients } from '../data/mockData';

// Simulated delay
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// Retrieve or initialize local session storage for patients to allow persistent demo interactions
const getPatientsFromStorage = () => {
  const stored = localStorage.getItem('hf_patients');
  if (!stored) {
    localStorage.setItem('hf_patients', JSON.stringify(mockPatients));
    return mockPatients;
  }
  return JSON.parse(stored);
};

const savePatientsToStorage = (patients) => {
  localStorage.setItem('hf_patients', JSON.stringify(patients));
};

export const patientService = {
  getAllPatients: async () => {
    await delay(300);
    return getPatientsFromStorage();
  },

  getPatientById: async (id) => {
    await delay(200);
    const patients = getPatientsFromStorage();
    return patients.find((p) => p.id === id) || null;
  },

  getDoctorPatients: async (doctorName) => {
    await delay(300);
    const patients = getPatientsFromStorage();
    return patients.filter((p) => p.assignedDoctor === doctorName);
  },

  updatePatient: async (id, updatedFields) => {
    await delay(400);
    const patients = getPatientsFromStorage();
    const index = patients.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Patient not found');
    
    patients[index] = { ...patients[index], ...updatedFields };
    savePatientsToStorage(patients);
    return patients[index];
  },

  addPatient: async (newPatient) => {
    await delay(400);
    const patients = getPatientsFromStorage();
    const nextIdNum = patients.length + 1;
    const formattedId = `HFC-${String(nextIdNum).padStart(3, '0')}`;
    
    const finalPatient = {
      id: formattedId,
      ...newPatient,
      clinicalInsights: newPatient.clinicalInsights || {
        riskMitigation: "Awaiting AI model evaluation.",
        careRecommendations: "Follow standard operational cardiorespiratory check-list.",
        followUpPlanning: "Schedule outpatient triage check within 14 days.",
        dischargeRecommendations: "Monitor vital signs and check-in daily."
      }
    };
    
    patients.unshift(finalPatient);
    savePatientsToStorage(patients);
    return finalPatient;
  }
};
