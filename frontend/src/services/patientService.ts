import {
  DashboardStats,
  Patient,
  PatientDetail,
  PatientFilterOptions,
  Role
} from '@/types'
import { patients as patientsApi } from '@/lib/api'
import { MOCK_DASHBOARD_STATS, MOCK_PATIENTS } from './mockData'

const LATENCY_MS = 250
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function getActiveToken (passedToken?: string): string | null {
  if (passedToken && passedToken !== 'mock-dev-token') return passedToken
  if (typeof window !== 'undefined') {
    const stored =
      sessionStorage.getItem('hf_auth_token') ||
      localStorage.getItem('hf_auth_token')
    if (stored && stored !== 'mock-dev-token') return stored
  }
  return null
}

export const patientService = {
  /**
   * Fetch dashboard statistics for a given role from Backend API with mock fallback.
   */
  async getDashboardStats (
    role: Role = 'doctor',
    token?: string
  ): Promise<DashboardStats> {
    const activeToken = getActiveToken(token)
    if (activeToken) {
      try {
        const stats = (await patientsApi.stats(
          activeToken
        )) as unknown as DashboardStats
        if (stats && typeof stats.total_admissions === 'number') {
          return {
            scope: stats.scope ?? (role === 'doctor' ? 'assigned' : 'hospital'),
            total_patients: stats.total_patients ?? 0,
            total_admissions: stats.total_admissions ?? 0,
            readmitted_within_30_days: stats.readmitted_within_30_days ?? 0,
            readmission_rate_percent: stats.readmission_rate_percent ?? 11.2,
            average_length_of_stay_days:
              stats.average_length_of_stay_days ?? 4.5,
            high_risk_patients_count: stats.high_risk_patients_count ?? 0,
            bed_occupancy_percent: stats.bed_occupancy_percent ?? 78.4,
            can_export: true
          }
        }
      } catch (err) {
        console.warn('Failed to load stats from live API, using fallback:', err)
      }
    }
    await delay(LATENCY_MS)
    return MOCK_DASHBOARD_STATS[role] ?? MOCK_DASHBOARD_STATS.doctor
  },

  /**
   * Fetch patients from real backend API with search and filter.
   */
  async getPatients (
    options: Partial<PatientFilterOptions> = {},
    _role: Role = 'doctor',
    limit: number = 50,
    offset: number = 0,
    token?: string
  ): Promise<{ patients: Patient[]; total: number }> {
    let list: Patient[] = []
    const activeToken = getActiveToken(token)

    // 1. Try real backend API if token is present
    if (activeToken) {
      try {
        const liveList = (await patientsApi.list(
          activeToken,
          limit,
          offset
        )) as unknown as Patient[]
        if (Array.isArray(liveList) && liveList.length > 0) {
          list = liveList
        }
      } catch (err) {
        console.warn(
          'Failed to load patients from live API, using fallback:',
          err
        )
        list = [...MOCK_PATIENTS]
      }
    }

    if (list.length === 0) {
      list = [...MOCK_PATIENTS]
    }

    // Filter by search query
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const query = options.searchQuery.toLowerCase().trim()
      list = list.filter(
        p =>
          p.medical_record_number?.toLowerCase().includes(query) ||
          (p.full_name && p.full_name.toLowerCase().includes(query)) ||
          p.primary_diagnosis?.toLowerCase().includes(query)
      )
    }

    // Filter by Risk Category
    if (options.riskCategory && options.riskCategory !== 'all') {
      list = list.filter(p => p.risk_category === options.riskCategory)
    }

    const total = list.length
    const paginated = list.slice(offset, offset + limit)

    return { patients: paginated, total }
  },

  /**
   * Fetch a single patient by ID from real API.
   */
  async getPatientById (
    id: number | string,
    token?: string
  ): Promise<PatientDetail | null> {
    const numericId = Number(id)
    const activeToken = getActiveToken(token)
    if (activeToken) {
      try {
        const detail = (await patientsApi.detail(
          activeToken,
          numericId
        )) as unknown as PatientDetail
        if (detail) return detail
      } catch (err) {
        console.warn(
          'Failed to load patient detail from live API, using fallback:',
          err
        )
      }
    }
    await delay(LATENCY_MS)
    const patient = MOCK_PATIENTS.find(p => p.id === numericId)
    return patient
      ? (JSON.parse(JSON.stringify(patient)) as PatientDetail)
      : null
  },

  /**
   * Fetch high risk patient alerts.
   */
  async getHighRiskAlerts (): Promise<Patient[]> {
    await delay(LATENCY_MS)
    return MOCK_PATIENTS.filter(p => p.risk_category === 'high')
  }
}
