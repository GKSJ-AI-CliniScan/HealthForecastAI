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

const toClientPatient = (patient) => ({
  ...patient,
  name: patient.name || patient.medical_record_number || `Patient ${patient.id}`,
  age: patient.age || patient.age_group,
  diagnosis: patient.diagnosis || patient.primary_diagnosis,
  assignedDoctorId: patient.assigned_doctor_id,
  clinicalNotes: patient.clinical_notes || [],
  treatmentHistory: patient.treatment_history || [],
  recoveryProgress: patient.recovery_progress || {},
  treatmentStatus: patient.treatment_status || 'Stable',
  riskLevel: patient.risk_level || 'Medium',
  readmissionProbability: patient.readmission_probability
    ? Math.round(patient.readmission_probability * 100)
    : 0,
  dischargeDate: patient.discharge_date,
});

const unwrap = (data) => data?.data ?? data;

export const patientService = {
  getAllPatients: async () => {
    try {
      const res = await apiClient.get('/patients');
      const payload = unwrap(res.data);
      if (Array.isArray(payload?.items)) {
        const patients = payload.items.map(toClientPatient);
        savePatientsToStorage(patients);
        return patients;
      }
    } catch (e) {
      console.warn('[patientService] Backend API unreachable. Using persistent local store:', e.message);
    }
    await delay(150);
    return getPatientsFromStorage();
  },

  getPatientById: async (id) => {
    try {
      const res = await apiClient.get(`/patients/${id}`);
      if (res.data) {
        return toClientPatient(unwrap(res.data));
      }
    } catch (e) {
      console.warn(`[patientService] Failed to fetch patient ${id} from API. Falling back to local store:`, e.message);
    }
    await delay(100);
    const patients = getPatientsFromStorage();
    return patients.find((p) => p.id === id) || null;
  },

  getDoctorPatients: async (doctorName) => {
    try {
      const res = await apiClient.get(`/patients/doctor/${encodeURIComponent(doctorName)}`);
      if (Array.isArray(res.data)) {
        return res.data.map(toClientPatient);
      }
      if (Array.isArray(res.data?.data)) {
        return res.data.data.map(toClientPatient);
      }
    } catch (e) {
      // Fallback
    }
    await delay(150);
    const patients = getPatientsFromStorage();
    return patients.filter((p) => !doctorName || doctorName === 'All' || p.assignedDoctor === doctorName);
  },

  updatePatient: async (id, updatedFields) => {
    try {
      const payload = {
        age_group: updatedFields.ageGroup || updatedFields.age_group,
        gender: updatedFields.gender,
        primary_diagnosis: updatedFields.diagnosis || updatedFields.primary_diagnosis,
        recovery_progress: updatedFields.recoveryProgress,
        treatment_status: updatedFields.treatmentStatus,
        risk_level: updatedFields.riskLevel,
        readmission_probability:
          updatedFields.readmissionProbability == null
            ? undefined
            : Number(updatedFields.readmissionProbability) / 100,
        discharge_date: updatedFields.dischargeDate,
      };
      const res = await apiClient.patch(`/patients/${id}`, payload);
      if (res.data) {
        const serverPatient = toClientPatient(unwrap(res.data));
        const patients = getPatientsFromStorage();
        const index = patients.findIndex((p) => p.id === id);
        if (index !== -1) {
          patients[index] = { ...patients[index], ...serverPatient };
          savePatientsToStorage(patients);
        }
        return serverPatient;
      }
    } catch (e) {
      console.warn('[patientService] API update failed. Updating local storage fallback:', e.message);
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
      const res = await apiClient.post('/patients', {
        medical_record_number: `MRN-${Date.now()}`,
        age_group: String(payload.age),
        gender: payload.gender,
        primary_diagnosis: payload.diagnosis,
        risk_level: String(payload.riskLevel).toLowerCase(),
        readmission_probability: Number(payload.readmissionProbability) / 100,
        treatment_status: payload.treatmentStatus,
        treatment_history: payload.treatmentHistory,
        clinical_notes: payload.clinicalNotes,
      });
      if (res.data) {
        const createdPatient = toClientPatient(unwrap(res.data));
        const patients = getPatientsFromStorage();
        patients.unshift(createdPatient);
        savePatientsToStorage(patients);
        return createdPatient;
      }
    } catch (e) {
      console.warn('[patientService] API add failed. Adding to local storage fallback:', e.message);
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
      if (res.data) {
        return toClientPatient(unwrap(res.data));
      }
    } catch (e) {
      console.warn('[patientService] API add note failed. Syncing local storage fallback:', e.message);
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
      if (res.data) {
        return toClientPatient(unwrap(res.data));
      }
    } catch (e) {
      console.warn('[patientService] API add treatment failed. Syncing local storage fallback:', e.message);
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
