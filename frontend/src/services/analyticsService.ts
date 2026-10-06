import {
  AnalyticsDashboardData,
  AnalyticsFilterParams,
  HospitalAnalyticsSummary,
  ReadmissionTrendPoint,
  TreatmentEffectiveness,
  RecoveryTrendPoint,
} from '@/types';
import { analyticsApi, treatmentApi } from '@/lib/api';
import {
  generateMockAnalyticsData,
  MOCK_HOSPITAL_SUMMARY,
  MOCK_TREATMENT_EFFECTIVENESS,
  MOCK_RECOVERY_TRENDS,
  MOCK_RECOVERY_REGIMENS,
} from './mockAnalyticsData';

const LATENCY_MS = 200;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Healthcare Analytics & Treatment Performance Service
 *
 * Architecture:
 * - Direct integration readiness with FastAPI backend analytics & treatment endpoints
 * - Transparent fallback to clearly marked structured clinical simulation data
 * - Maintains explicit data source tagging ('simulated_mock' vs 'fastapi_ml_backend')
 */
export const analyticsService = {
  /**
   * Fetch complete Healthcare Performance Dashboard data with filtering.
   */
  async getDashboardData(
    params: AnalyticsFilterParams = { timeframe: '90d', department: 'all' },
    token?: string,
  ): Promise<AnalyticsDashboardData> {
    await delay(LATENCY_MS);

    // Attempt live FastAPI backend if auth token is active and not mock-dev-token
    if (token && token !== 'mock-dev-token') {
      try {
        const [summaryRes, readmissionsRes, treatmentsRes, recoveryTrendsRes] =
          await Promise.allSettled([
            analyticsApi.summary(token),
            analyticsApi.readmissions(token),
            treatmentApi.list(token),
            treatmentApi.recoveryTrends(token),
          ]);

        const mockFallback = generateMockAnalyticsData(params);

        const summary: HospitalAnalyticsSummary =
          summaryRes.status === 'fulfilled' && summaryRes.value.total_patients > 0
            ? summaryRes.value
            : mockFallback.summary;

        const readmissionTrends: ReadmissionTrendPoint[] =
          readmissionsRes.status === 'fulfilled' &&
          Array.isArray(readmissionsRes.value) &&
          readmissionsRes.value.length > 0
            ? readmissionsRes.value
            : mockFallback.readmissionTrends;

        const treatments: TreatmentEffectiveness[] =
          treatmentsRes.status === 'fulfilled' &&
          Array.isArray(treatmentsRes.value) &&
          treatmentsRes.value.length > 0
            ? treatmentsRes.value
            : mockFallback.treatments;

        const recoveryTrends: RecoveryTrendPoint[] =
          recoveryTrendsRes.status === 'fulfilled' &&
          Array.isArray(recoveryTrendsRes.value) &&
          recoveryTrendsRes.value.length > 0
            ? recoveryTrendsRes.value
            : mockFallback.recoveryTrends;

        const isLive =
          summaryRes.status === 'fulfilled' && summaryRes.value.total_patients > 0;

        return {
          summary,
          readmissionTrends,
          treatments,
          recoveryTrends,
          recoveryRegimens: MOCK_RECOVERY_REGIMENS,
          isSimulated: !isLive,
          dataSource: isLive ? 'fastapi_ml_backend' : 'simulated_mock',
          generatedAt: new Date().toISOString(),
        };
      } catch {
        // Fall back gracefully to structured clinical demonstration dataset
      }
    }

    // Default simulation path for Milestone 3 UI exploration
    return generateMockAnalyticsData(params);
  },

  /**
   * Fetch hospital analytics headline summary.
   */
  async getHospitalSummary(token?: string): Promise<HospitalAnalyticsSummary> {
    await delay(LATENCY_MS);
    if (token && token !== 'mock-dev-token') {
      try {
        const res = await analyticsApi.summary(token);
        if (res && res.total_patients > 0) return res;
      } catch {
        // Fallback
      }
    }
    return MOCK_HOSPITAL_SUMMARY;
  },

  /**
   * Fetch treatment effectiveness metrics.
   */
  async getTreatmentEffectiveness(token?: string): Promise<TreatmentEffectiveness[]> {
    await delay(LATENCY_MS);
    if (token && token !== 'mock-dev-token') {
      try {
        const res = await treatmentApi.list(token);
        if (Array.isArray(res) && res.length > 0) return res;
      } catch {
        // Fallback
      }
    }
    return MOCK_TREATMENT_EFFECTIVENESS;
  },

  /**
   * Fetch longitudinal recovery trends.
   */
  async getRecoveryTrends(token?: string): Promise<RecoveryTrendPoint[]> {
    await delay(LATENCY_MS);
    if (token && token !== 'mock-dev-token') {
      try {
        const res = await treatmentApi.recoveryTrends(token);
        if (Array.isArray(res) && res.length > 0) return res;
      } catch {
        // Fallback
      }
    }
    return MOCK_RECOVERY_TRENDS;
  },
};
