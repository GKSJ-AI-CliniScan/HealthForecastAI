import Link from 'next/link';

import {
  Card,
  Cell,
  EmptyNote,
  ErrorNote,
  RiskBadge,
  Row,
  StatTile,
  Table,
} from '@/components/ui';
import { ApiError, apiFetch } from '@/lib/api';
import { getToken, requireUser } from '@/lib/session';
import type { ReadmissionForecast, RiskPrediction } from '@/types';

export const dynamic = 'force-dynamic';

const FORECAST_HORIZON_DAYS = 30;

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }
  // The backend serialises UTC. Without an offset JavaScript reads an ISO string
  // as local time, which silently shifts a clinical timestamp by the viewer's
  // offset, so an absent offset is made explicit before parsing.
  const normalised = /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

/** Turn a failed request into a message that says what actually went wrong. */
function describeFailure(error: unknown, subject: string): string {
  if (error instanceof ApiError && error.status === 403) {
    return `Your role does not have access to ${subject}.`;
  }
  if (error instanceof ApiError) {
    return `The server returned an error (${error.status}) loading ${subject}.`;
  }
  return `Could not reach the server to load ${subject}. Is the backend running?`;
}

/**
 * Risk prediction dashboard.
 *
 * Both requests are independent: a failure on one still lets the other render,
 * because the two endpoints are authorised separately. A hospital administrator,
 * for example, may read the forecast while the high-risk cohort is refused, and
 * losing the whole page to that would be wrong.
 *
 * Scope is decided entirely by the backend - a doctor's cohort is their own
 * caseload, including patients granted through doctor_patient_map. This page
 * reports which scope it received rather than assuming one.
 */
export default async function RiskDashboardPage() {
  const user = await requireUser();
  const token = await getToken();

  let highRiskPatients: RiskPrediction[] = [];
  let highRiskError: string | null = null;

  try {
    highRiskPatients = await apiFetch<RiskPrediction[]>(
      '/risk/high-risk',
      { cache: 'no-store' },
      token,
    );
  } catch (error) {
    highRiskError = describeFailure(error, 'high-risk patients');
  }

  let forecast: ReadmissionForecast | null = null;
  let forecastError: string | null = null;

  try {
    forecast = await apiFetch<ReadmissionForecast>(
      `/risk/forecast?horizon_days=${FORECAST_HORIZON_DAYS}`,
      { cache: 'no-store' },
      token,
    );
  } catch (error) {
    forecastError = describeFailure(error, 'the readmission forecast');
  }

  // The backend labels its own scope; fall back to the role only if absent.
  const scopeDescription =
    forecast?.scope === 'assigned_patients'
      ? 'Figures cover the patients assigned to you.'
      : forecast?.scope === 'hospital'
        ? 'Figures cover the whole hospital.'
        : user.role === 'doctor'
          ? 'Figures cover the patients assigned to you.'
          : 'Figures cover the patients your role permits.';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Risk</h1>
        <p className="mt-1 text-sm opacity-70">{scopeDescription}</p>
      </div>

      {forecastError ? (
        <ErrorNote>{forecastError}</ErrorNote>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label={`Predicted rate (${forecast?.horizon_days ?? FORECAST_HORIZON_DAYS}d)`}
            value={forecast ? formatPercent(forecast.predicted_rate) : '-'}
          />
          <StatTile
            label="Predicted readmissions"
            value={forecast ? forecast.predicted_readmissions : '-'}
          />
          <StatTile
            label="High-risk patients"
            value={highRiskError ? '-' : highRiskPatients.length}
            tone={!highRiskError && highRiskPatients.length > 0 ? 'alert' : 'default'}
          />
        </div>
      )}

      {highRiskError ? (
        <ErrorNote>{highRiskError}</ErrorNote>
      ) : (
        <Card title="High-risk patients">
          {highRiskPatients.length === 0 ? (
            <EmptyNote>
              No patients are currently in the high-risk band. Patients appear here once they are
              scored above the high-risk threshold.
            </EmptyNote>
          ) : (
            <Table headers={['Patient', 'Probability', 'Risk', 'Model', 'Scored at', '']}>
              {highRiskPatients.map((prediction) => (
                <Row key={prediction.patient_id}>
                  <Cell>Patient {prediction.patient_id}</Cell>
                  <Cell>{formatPercent(prediction.readmission_probability)}</Cell>
                  <Cell>
                    <RiskBadge band={prediction.risk_category} />
                  </Cell>
                  <Cell>
                    {prediction.model_name} ({prediction.model_version})
                  </Cell>
                  <Cell>{formatDate(prediction.created_at)}</Cell>
                  <Cell>
                    <Link
                      href={`/dashboard/patients/${prediction.patient_id}`}
                      className="underline underline-offset-2"
                    >
                      View
                    </Link>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
