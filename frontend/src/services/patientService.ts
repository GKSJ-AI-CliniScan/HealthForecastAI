import { DashboardStats, Patient, PatientDetail, PatientFilterOptions, Role } from '@/types';
import { MOCK_DASHBOARD_STATS, MOCK_PATIENTS } from './mockData';

// Simulated API network latency for realistic frontend loading states
const LATENCY_MS = 250;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const patientService = {
  /**
   * Fetch dashboard statistics for a given role.
   */
  async getDashboardStats(role: Role = 'doctor'): Promise<DashboardStats> {
    await delay(LATENCY_MS);
    return MOCK_DASHBOARD_STATS[role] ?? MOCK_DASHBOARD_STATS.doctor;
  },

  /**
   * Fetch patients with search, filtering, and role scoping.
   */
  async getPatients(
    options: Partial<PatientFilterOptions> = {},
    role: Role = 'doctor',
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ patients: Patient[]; total: number }> {
    await delay(LATENCY_MS);

    let list: Patient[] = [...MOCK_PATIENTS];

    // Role-based data scoping
    if (role === 'doctor') {
      if (options.scope === 'assigned') {
        list = list.filter((p) => p.assigned_doctor_id === 101);
      }
    } else if (role === 'researcher') {
      // Researcher receives de-identified cohort records
      list = list.map((p) => ({
        ...p,
        first_name: undefined,
        last_name: undefined,
        full_name: undefined,
        medical_record_number: p.cohort_id ?? `COHORT-${p.id.toString().padStart(4, '0')}`,
      }));
    }

    // Filter by search query (MRN, Name, Diagnosis, Department)
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const query = options.searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.medical_record_number.toLowerCase().includes(query) ||
          (p.full_name && p.full_name.toLowerCase().includes(query)) ||
          p.primary_diagnosis.toLowerCase().includes(query) ||
          (p.department && p.department.toLowerCase().includes(query)),
      );
    }

    // Filter by Risk Category
    if (options.riskCategory && options.riskCategory !== 'all') {
      list = list.filter((p) => p.risk_category === options.riskCategory);
    }

    // Filter by Age Group
    if (options.ageGroup && options.ageGroup !== 'all') {
      list = list.filter((p) => p.age_group === options.ageGroup);
    }

    // Filter by Gender
    if (options.gender && options.gender !== 'all') {
      list = list.filter((p) => p.gender?.toLowerCase() === options.gender?.toLowerCase());
    }

    // Filter by Department
    if (options.department && options.department !== 'all') {
      list = list.filter((p) => p.department === options.department);
    }

    // Filter by Patient Status (Inpatient vs Discharged)
    if (options.status && options.status !== 'all') {
      const statusLower = options.status.toLowerCase();
      if (statusLower === 'inpatient' || statusLower === 'admitted') {
        list = list.filter((p) => {
          if (p.admission_status === 'admitted') return true;
          if (p.admissions && p.admissions.length > 0) {
            return p.admissions.some((a) => a.discharge_date === null);
          }
          return false;
        });
      } else if (statusLower === 'discharged') {
        list = list.filter((p) => {
          if (p.admission_status === 'discharged') return true;
          if (p.admissions && p.admissions.length > 0) {
            return p.admissions.every((a) => a.discharge_date !== null);
          }
          return false;
        });
      }
    }

    const total = list.length;
    const paginated = list.slice(offset, offset + limit);

    return { patients: paginated, total };
  },

  /**
   * Fetch a single patient by ID with full details.
   */
  async getPatientById(id: number | string): Promise<PatientDetail | null> {
    await delay(LATENCY_MS);
    const numericId = Number(id);
    const patient = MOCK_PATIENTS.find((p) => p.id === numericId);
    return patient ? JSON.parse(JSON.stringify(patient)) : null;
  },

  /**
   * Fetch high risk patient alerts.
   */
  async getHighRiskAlerts(): Promise<Patient[]> {
    await delay(LATENCY_MS);
    return MOCK_PATIENTS.filter((p) => p.risk_category === 'high');
  },
};
