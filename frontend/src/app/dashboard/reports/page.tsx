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

/** Windows the report projects. 30 days is the window the model predicts. */
const HORIZONS = [30, 60, 90];

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Render a timestamp the backend serialised as UTC.
 *
 * An ISO string without an offset is read by JavaScript as local time, which
 * would silently shift a clinical timestamp by the viewer's offset.
 */
function formatTimestamp(value: string | null): string {
  if (!value) {
    return '-';
  }
  const normalised = /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

const SCOPE_LABELS: Record<string, string> = {
  assigned_patients: 'Patients assigned to you',
  hospital: 'Hospital-wide',
  aggregated: 'Aggregated figures only',
};

/**
 * Readmission forecasting report - SRS FR-RPT-02.
 *
 * Everything here comes from GET /reports/forecast, which the backend scopes to
 * the caller. This page renders what the caller was permitted to receive and
 * states which scope that was, rather than filtering anything itself.
 */
export default async function ReportsPage() {
  const user = await requireUser();
  const token = await getToken();

  let report: ForecastingReport | null = null;
  let error: string | null = null;

  try {
    report = await apiFetch<ForecastingReport>(
      `/reports/forecast?${HORIZONS.map((days) => `horizon_days=${days}`).join('&')}`,
      { cache: 'no-store' },
      token,
    );
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 403) {
      error = 'Your role does not have access to risk reporting.';
    } else if (caught instanceof ApiError) {
      error = `The reporting service returned an error (${caught.status}).`;
    } else {
      error = 'Could not reach the reporting service. Is the backend running?';
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Readmission forecast report</h1>
        </header>
        <ErrorNote>{error}</ErrorNote>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Readmission forecast report</h1>
        </header>
        <EmptyNote>No report was returned.</EmptyNote>
      </div>
    );
  }

  const primaryHorizon =
    report.horizons.find((horizon) => horizon.horizon_days === 30) ?? report.horizons[0];
  const cohort = report.high_risk_patients;
  const unscored = report.patients_in_scope - report.patients_scored;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Readmission forecast report</h1>
          <p className="mt-1 text-sm opacity-70">
            {SCOPE_LABELS[report.metadata.scope] ?? report.metadata.scope} &middot; generated{' '}
            {formatTimestamp(report.metadata.generated_at)}
          </p>
        </div>
        <dl className="text-right text-xs opacity-60">
          <div className="flex justify-end gap-2">
            <dt>Report version</dt>
            <dd className="tabular-nums">{report.metadata.report_version}</dd>
          </div>
          <div className="flex justify-end gap-2">
            <dt>Prepared for</dt>
            <dd className="capitalize">{report.metadata.generated_for_role.replace('_', ' ')}</dd>
          </div>
        </dl>
      </header>

      {/* ---- Forecast summary ---- */}
      <section aria-labelledby="forecast-summary" className="space-y-4">
        <h2 id="forecast-summary" className="text-sm font-semibold uppercase tracking-wide opacity-70">
          Forecast summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={`Predicted readmissions (${primaryHorizon?.horizon_days ?? 30}d)`}
            value={primaryHorizon?.predicted_readmissions ?? 0}
            caption="Expected within the primary horizon"
          />
          <StatTile
            label="Predicted rate"
            value={primaryHorizon ? formatPercent(primaryHorizon.predicted_rate) : '-'}
            caption="Mean probability across scored patients"
          />
          <StatTile
            label="Population size"
            value={report.patients_in_scope}
            caption="Patients within the report scope"
          />
          <StatTile
            label="High-risk patients"
            value={report.risk_distribution.high}
            tone={report.risk_distribution.high > 0 ? 'alert' : 'default'}
            caption="Currently in the high band"
          />
        </div>
      </section>

      {/* ---- Horizons + coverage ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Forecast horizons">
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
            Horizons beyond 30 days rescale the model&apos;s 30-day probability. They are not an
            independent time-series forecast.
          </p>
        </Card>

        <Card title="Coverage">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="opacity-60">Patients scored</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {report.patients_scored} / {report.patients_in_scope}
              </dd>
            </div>
            <div>
              <dt className="opacity-60">Coverage rate</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatPercent(report.coverage_rate)}
              </dd>
            </div>
            <div>
              <dt className="opacity-60">Observed readmissions</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {report.observed_readmissions} / {report.total_admissions}
              </dd>
            </div>
            <div>
              <dt className="opacity-60">Observed rate</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatPercent(report.observed_readmission_rate)}
              </dd>
            </div>
          </dl>
          {unscored > 0 && (
            <p className="mt-4 text-xs opacity-60">
              {unscored} patient{unscored === 1 ? '' : 's'} in scope{' '}
              {unscored === 1 ? 'has' : 'have'} no stored prediction and {unscored === 1 ? 'is' : 'are'}{' '}
              excluded from the projections above.
            </p>
          )}
        </Card>
      </div>

      {/* ---- Risk distribution ---- */}
      <Card title="Risk distribution">
        <DistributionBar
          segments={[
            { label: 'High', value: report.risk_distribution.high, className: 'bg-risk-high' },
            { label: 'Medium', value: report.risk_distribution.medium, className: 'bg-risk-medium' },
            { label: 'Low', value: report.risk_distribution.low, className: 'bg-risk-low' },
          ]}
        />
        <p className="mt-4 text-xs opacity-60">
          Mean predicted probability {formatPercent(report.average_risk_probability)} across{' '}
          {report.patients_scored} scored{' '}
          {report.patients_scored === 1 ? 'patient' : 'patients'}.
        </p>
      </Card>

      {/* ---- High-risk cohort ---- */}
      <Card title="High-risk cohort">
        {cohort === null ? (
          <EmptyNote>
            Your role receives aggregated figures only, so individual patients are not listed.
          </EmptyNote>
        ) : cohort.length === 0 ? (
          <EmptyNote>No patients are currently in the high-risk band.</EmptyNote>
        ) : (
          <Table headers={['Record number', 'Probability', 'Risk', 'Scored at', '']}>
            {cohort.map((entry) => (
              <Row key={entry.patient_id}>
                <Cell>{entry.medical_record_number ?? `Patient ${entry.patient_id}`}</Cell>
                <Cell>{formatPercent(entry.readmission_probability)}</Cell>
                <Cell>
                  <RiskBadge band={entry.risk_category} />
                </Cell>
                <Cell>{formatTimestamp(entry.scored_at)}</Cell>
                <Cell>
                  {can(user, 'risk_report:read') ? (
                    <Link
                      href={`/dashboard/reports/${entry.patient_id}`}
                      className="underline underline-offset-2"
                    >
                      Full report
                    </Link>
                  ) : null}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>

      {/* ---- Metadata / data notes ---- */}
      {report.metadata.notes.length > 0 && (
        <Card title="Data notes">
          <ul className="space-y-1 text-sm opacity-70">
            {report.metadata.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs opacity-50">
        Report {report.metadata.report_version} generated{' '}
        {formatTimestamp(report.metadata.generated_at)} for{' '}
        {user.profile?.full_name ?? user.subject}. Figures reflect stored predictions at the time of
        generation.
      </p>
    </div>
  );
}
