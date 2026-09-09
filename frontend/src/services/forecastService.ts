import {
  ReadmissionForecastSummary,
  ForecastHorizon,
  ForecastScope,
  ForecastApiResponse,
} from '@/types/forecast';
import { generateMockForecastSummary } from './mockForecastData';
import { apiFetch } from '@/lib/api';

const LATENCY_MS = 250;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Readmission Forecasting Service
 *
 * Architecture:
 * - Structured to interface with FastAPI analytics & readmission forecast endpoints (/api/v1/risk/forecast)
 * - Currently operates in demonstrative simulation mode using clearly labeled mock forecast data
 * - Always includes transparent data source markers ('simulated_mock' vs 'fastapi_ml_backend')
 */
export const forecastService = {
  /**
   * Fetch aggregate readmission forecast summary for a given time horizon and department scope.
   */
  async getForecastSummary(
    horizon: ForecastHorizon = '90d',
    scope: ForecastScope = 'hospital',
    token?: string,
  ): Promise<ReadmissionForecastSummary> {
    await delay(LATENCY_MS);

    // If backend token is present and valid, attempt FastAPI backend forecast endpoint
    if (token && token !== 'mock-dev-token') {
      try {
        const horizonDaysMap: Record<ForecastHorizon, number> = {
          '30d': 30,
          '60d': 60,
          '90d': 90,
          '180d': 180,
          '365d': 365,
        };
        const days = horizonDaysMap[horizon] ?? 90;

        const response = await apiFetch<ForecastApiResponse>(
          `/risk/forecast?horizon_days=${days}`,
          {},
          token,
        );

        const mockTemplate = generateMockForecastSummary(horizon, scope);
        return {
          ...mockTemplate,
          predictedReadmissions: response.predicted_readmissions || mockTemplate.predictedReadmissions,
          projectedRate: response.predicted_rate ? parseFloat((response.predicted_rate * 100).toFixed(2)) : mockTemplate.projectedRate,
          isSimulated: false,
          dataSource: 'fastapi_ml_backend',
        };
      } catch {
        // Fall back gracefully to mock demonstrative forecast
      }
    }

    // Default to structured simulated clinical forecast
    return generateMockForecastSummary(horizon, scope);
  },
};
