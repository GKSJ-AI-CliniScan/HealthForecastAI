import Link from 'next/link';

import {
  Card,
  Cell,
  DistributionBar,
  EmptyNote,
  ErrorNote,
  RiskBadge,
  Row,
  StatTile,
  Table,
} from '@/components/ui';
import { ApiError, apiFetch } from '@/lib/api';
import { can, getToken, requireUser } from '@/lib/session';
import type { ForecastingReport } from '@/types';

export const dynamic = 'force-dynamic';

/** Horizons the overview summarises. 30 days is the window the model predicts. */
const HORIZONS = [30, 60, 90];

/** Rows in the recent high-risk table before it becomes a scrolling wall. */
const RECENT_LIMIT = 8;

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }
  // The backend serialises UTC; an ISO string without an offset would otherwise
  // be read as local time and silently shift a clinical timestamp.
  const normalised = /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

/**
 * Clinical operations overview.
 *
 * Every figure comes from GET /reports/forecast, which the backend already
 * scopes to the caller: a doctor sees their own caseload, hospital and system
 * administrators the whole hospital, and a researcher aggregates with no
 * identifiable rows. This page therefore does no filtering of its own - it
 * renders what the caller was allowed to receive, and says which scope that was.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const token = await getToken();

  const canReadReports =
    can(user, 'risk_report:read') || can(user, 'risk_report:read_aggregated');

  let report: ForecastingReport | null = null;
  let reportError: string | null = null;

  if (canReadReports) {
    try {
      report = await apiFetch<ForecastingReport>(
        `/reports/forecast?${HORIZONS.map((days) => `horizon_days=${days}`).join('&')}`,
        { cache: 'no-store' },
        token,
      );
    } catch (error) {
      // Distinguish "not permitted" from "not reachable" - collapsing them tells
      // a clinician to restart a backend that is running perfectly well.
      if (error instanceof ApiError && error.status === 403) {
        reportError = 'Your role does not have access to risk reporting.';
      } else if (error instanceof ApiError) {
        reportError = `The reporting service returned an error (${error.status}).`;
      } else {
        reportError = 'Could not reach the reporting service. Is the backend running?';
      }
    }
  }

  const primaryHorizon =
    report?.horizons.find((horizon) => horizon.horizon_days === 30) ?? report?.horizons[0];
  const highRiskCount = report?.risk_distribution.high ?? 0;
  const cohort = report?.high_risk_patients ?? null;
  const scopeLabel = user.role === 'doctor' ? 'your caseload' : 'the hospital';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Welcome{user.profile ? `, ${user.profile.full_name}` : ''}
        </h1>
        <p className="mt-1 text-sm opacity-70">
          {user.role === 'doctor'
            ? 'Readmission risk across the patients assigned to you.'
            : 'Readmission risk across the patients your role permits.'}
        </p>
      </div>

      {!canReadReports ? (
        <EmptyNote>
          Your role does not include risk reporting, so no clinical summary is shown here.
        </EmptyNote>
      ) : reportError ? (
        <ErrorNote>{reportError}</ErrorNote>
      ) : !report ? (
        <EmptyNote>Loading the clinical summary...</EmptyNote>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="High-risk patients"
              value={highRiskCount}
              tone={highRiskCount > 0 ? 'alert' : 'default'}
              caption={`Currently in the high band across ${scopeLabel}`}
            />
            <StatTile
              label={`Forecast readmissions (${primaryHorizon?.horizon_days ?? 30}d)`}
              value={primaryHorizon?.predicted_readmissions ?? 0}
              caption={
                primaryHorizon ? `At ${formatPercent(primaryHorizon.predicted_rate)} predicted rate` : undefined
              }
            />
            <StatTile
              label="Patients scored"
              value={`${report.patients_scored} / ${report.patients_in_scope}`}
              caption={`${formatPercent(report.coverage_rate)} of patients have a risk score`}
            />
            <StatTile
              label="Observed readmission rate"
              value={formatPercent(report.observed_readmission_rate)}
              caption={`${report.observed_readmissions} of ${report.total_admissions} recorded admissions`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Risk distribution">
              <DistributionBar
                segments={[
                  {
                    label: 'High',
                    value: report.risk_distribution.high,
                    className: 'bg-risk-high',
                  },
                  {
                    label: 'Medium',
                    value: report.risk_distribution.medium,
                    className: 'bg-risk-medium',
                  },
                  { label: 'Low', value: report.risk_distribution.low, className: 'bg-risk-low' },
                ]}
              />
              <p className="mt-4 text-xs opacity-60">
                Mean predicted probability {formatPercent(report.average_risk_probability)} across{' '}
                {report.patients_scored} scored{' '}
                {report.patients_scored === 1 ? 'patient' : 'patients'}.
              </p>
            </Card>

            <Card title="Readmission forecast">
              {report.horizons.length === 0 ? (
                <EmptyNote>No forecast horizons were returned.</EmptyNote>
              ) : (
                <Table headers={['Horizon', 'Predicted rate', 'Predicted readmissions']}>
                  {report.horizons.map((horizon) => (
                    <Row key={horizon.horizon_days}>
                      <Cell>{horizon.horizon_days} days</Cell>
                      <Cell>{formatPercent(horizon.predicted_rate)}</Cell>
                      <Cell>{horizon.predicted_readmissions}</Cell>
                    </Row>
                  ))}
                </Table>
              )}
              <p className="mt-4 text-xs opacity-60">
                Horizons beyond 30 days rescale the model&apos;s 30-day probability; they are not an
                independent time-series forecast.
              </p>
            </Card>
          </div>

          <Card
            title="Recent high-risk patients"
            actions={
              can(user, 'risk_report:read') ? (
                <Link href="/dashboard/risk" className="text-sm underline underline-offset-2">
                  Open risk dashboard
                </Link>
              ) : undefined
            }
          >
            {cohort === null ? (
              <EmptyNote>
                Your role receives aggregated figures only, so individual patients are not listed.
              </EmptyNote>
            ) : cohort.length === 0 ? (
              <EmptyNote>No patients are currently in the high-risk band.</EmptyNote>
            ) : (
              <Table headers={['Record number', 'Probability', 'Risk', 'Scored at', '']}>
                {cohort.slice(0, RECENT_LIMIT).map((entry) => (
                  <Row key={entry.patient_id}>
                    <Cell>{entry.medical_record_number ?? `Patient ${entry.patient_id}`}</Cell>
                    <Cell>{formatPercent(entry.readmission_probability)}</Cell>
                    <Cell>
                      <RiskBadge band={entry.risk_category} />
                    </Cell>
                    <Cell>{formatDate(entry.scored_at)}</Cell>
                    <Cell>
                      <Link
                        href={`/dashboard/patients/${entry.patient_id}`}
                        className="underline underline-offset-2"
                      >
                        View
                      </Link>
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}
            {cohort && cohort.length > RECENT_LIMIT && (
              <p className="mt-3 text-xs opacity-60">
                Showing {RECENT_LIMIT} of {cohort.length}. The risk dashboard lists the full cohort.
              </p>
            )}
          </Card>

          {report.metadata.notes.length > 0 && (
            <Card title="Data notes">
              <ul className="space-y-1 text-sm opacity-70">
                {report.metadata.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        {(can(user, 'patient:read_assigned') || can(user, 'patient:read_all')) && (
          <Link
            href="/dashboard/patients"
            className="rounded-md border border-[var(--border)] px-3 py-1.5"
          >
            View patients
          </Link>
        )}
        {can(user, 'user:manage') && (
          <Link
            href="/dashboard/users"
            className="rounded-md border border-[var(--border)] px-3 py-1.5"
          >
            Manage users
          </Link>
        )}
      </div>
    </div>
  );
}
