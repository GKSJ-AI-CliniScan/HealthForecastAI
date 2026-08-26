import apiClient from './api';
import { mockPatients } from '../data/mockData';

// Simulated delay
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

// Retrieve or initialize local session storage for patients to allow persistent demo interactions
const getPatientsFromStorage = () => {
  const stored = localStorage.getItem('hf_patients');
  if (!stored) {
    localStorage.setItem('hf_patients', JSON.stringify(mockPatients));
    return mockPatients;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    localStorage.setItem('hf_patients', JSON.stringify(mockPatients));
    return mockPatients;
  }
};

const savePatientsToStorage = (patients) => {
  localStorage.setItem('hf_patients', JSON.stringify(patients));
};

export const patientService = {
  getAllPatients: async () => {
    try {
      const res = await apiClient.get('/patients');
      if (res.data && res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        savePatientsToStorage(res.data.data);
        return res.data.data;
      }
    } catch (e) {
      throw e;
    }
    await delay(150);
    return getPatientsFromStorage();
  },

  getPatientById: async (id) => {
    try {
      const res = await apiClient.get(`/patients/${id}`);
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      throw e;
    }
    await delay(100);
    const patients = getPatientsFromStorage();
    return patients.find((p) => p.id === id) || null;
  },

  getDoctorPatients: async (doctorName) => {
    try {
      const res = await apiClient.get(`/patients/doctor/${encodeURIComponent(doctorName)}`);
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch (e) {
      throw e;
    }
    await delay(150);
    const patients = getPatientsFromStorage();
    return patients.filter((p) => !doctorName || doctorName === 'All' || p.assignedDoctor === doctorName);
  },

  updatePatient: async (id, updatedFields) => {
    try {
      const res = await apiClient.put(`/patients/${id}`, updatedFields);
      if (res.data && res.data.success && res.data.data) {
        const patients = getPatientsFromStorage();
        const index = patients.findIndex((p) => p.id === id);
        if (index !== -1) {
          patients[index] = { ...patients[index], ...res.data.data };
          savePatientsToStorage(patients);
        }
        return res.data.data;
      }
    } catch (e) {
      throw e;
    }
    await delay(150);
    const patients = getPatientsFromStorage();
    const index = patients.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Patient not found');

    patients[index] = { ...patients[index], ...updatedFields };
    savePatientsToStorage(patients);
    return patients[index];
  },

  addPatient: async (newPatient) => {
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      ...newPatient,
      admissionDate: newPatient.admissionDate || today,
      treatmentStatus: newPatient.treatmentStatus || 'Stable',
      riskLevel: newPatient.riskLevel || 'Medium',
      readmissionProbability: parseInt(newPatient.readmissionProbability) || 50,
      age: parseInt(newPatient.age) || 45,
      contact: newPatient.contact || {
        phone: newPatient.phone || '+1 (555) 019-2834',
        email: newPatient.email || `${(newPatient.name || 'patient').toLowerCase().replace(/\s+/g, '.')}@patientmail.com`,
        address: newPatient.address || 'Seattle, WA',
      },
      treatmentHistory: newPatient.treatmentHistory || [
        `Initial clinical admission triage (${newPatient.diagnosis || 'General'})`,
      ],
      clinicalNotes: newPatient.clinicalNotes || [
        {
          id: `note_${Date.now()}`,
          doctor: newPatient.assignedDoctor || 'Doctor',
          note: `Patient admitted with ${newPatient.diagnosis || 'symptoms'}. Baseline observation started.`,
          category: 'Admission Note',
          date: today,
        },
      ],
      clinicalInsights: newPatient.clinicalInsights || {
        riskMitigation: 'Regular telemetry review and medication titration recommended.',
        careRecommendations: 'Follow standard post-admission recovery protocol.',
        followUpPlanning: 'Schedule outpatient clinic visit within 14 days.',
        dischargeRecommendations: 'Monitor vital signs daily and review diet adherence.',
      },
    };

    try {
      const res = await apiClient.post('/patients', payload);
      if (res.data && res.data.success && res.data.data) {
        const patients = getPatientsFromStorage();
        patients.unshift(res.data.data);
        savePatientsToStorage(patients);
        return res.data.data;
      }
    } catch (e) {
      throw e;
    }

    await delay(150);
    const patients = getPatientsFromStorage();
    let maxNum = 0;
    for (const p of patients) {
      if (p.id && p.id.startsWith('HFC-')) {
        const num = parseInt(p.id.replace('HFC-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    const formattedId = `HFC-${String(maxNum + 1).padStart(3, '0')}`;

    const finalPatient = {
      id: formattedId,
      ...payload,
    };

    patients.unshift(finalPatient);
    savePatientsToStorage(patients);
    return finalPatient;
  },

  addClinicalNote: async (patientId, noteData) => {
    const today = new Date().toISOString().split('T')[0];
    const newNote = {
      id: `note_${Date.now()}`,
      doctor: noteData.doctor || 'Doctor',
      note: noteData.note,
      category: noteData.category || 'Clinical Observation',
      date: noteData.date || today,
    };

    try {
      const res = await apiClient.post(`/patients/${patientId}/notes`, newNote);
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      throw e;
    }

    await delay(100);
    const patients = getPatientsFromStorage();
    const index = patients.findIndex((p) => p.id === patientId);
    if (index !== -1) {
      if (!patients[index].clinicalNotes) patients[index].clinicalNotes = [];
      patients[index].clinicalNotes.unshift(newNote);
      savePatientsToStorage(patients);
      return patients[index];
    }
    return null;
  },

  addTreatment: async (patientId, treatmentString) => {
    try {
      const res = await apiClient.post(`/patients/${patientId}/treatments`, { treatment: treatmentString });
      if (res.data && res.data.success && res.data.data) {
        return res.data.data;
      }
    } catch (e) {
      throw e;
    }

    await delay(100);
    const patients = getPatientsFromStorage();
    const index = patients.findIndex((p) => p.id === patientId);
    if (index !== -1) {
      if (!patients[index].treatmentHistory) patients[index].treatmentHistory = [];
      patients[index].treatmentHistory.push(treatmentString);
      savePatientsToStorage(patients);
      return patients[index];
    }
    return null;
  },
};
