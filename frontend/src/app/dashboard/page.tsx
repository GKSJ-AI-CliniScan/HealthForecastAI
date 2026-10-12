import Link from 'next/link';

import ForecastChart from '@/components/charts/ForecastChart';
import RiskScoreBar from '@/components/charts/RiskScoreBar';
import { Card, Cell, MetricStrip, PageHeader, RiskBadge, Row, StatTile, Table } from '@/components/ui';
import { SCORE_NOTES, ScoreNote, formatModelScore } from '@/components/ui/ModelDisclaimer';
import { formatDate, roleLabel } from '@/components/ui/labels';
import { apiFetch } from '@/lib/api';
import { insightLinks } from '@/lib/navigation';
import { can, getToken, requireUser } from '@/lib/session';
import type { Patient, ReadmissionForecast, RiskPrediction } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Role-specific overview.
 *
 * A doctor's patient count is already narrowed to their own caseload by the
 * backend, so this page does no filtering of its own.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const token = await getToken();

  let patientCount: number | null = null;
  let unreachable = false;

  if (can(user, 'patient:read_assigned') || can(user, 'patient:read_all')) {
    try {
      const patients = await apiFetch<Patient[]>(
        '/patients?limit=200',
        { cache: 'no-store' },
        token,
      );
      patientCount = patients.length;
    } catch {
      unreachable = true;
    }
  }

  // Doctor + System Administrator only (RISK_REPORT_READ).
  const highRiskPatients = can(user, 'risk_report:read')
    ? await apiFetch<RiskPrediction[]>('/risk/high-risk', { cache: 'no-store' }, token).catch(
        () => [] as RiskPrediction[],
      )
    : [];

  // Doctor + Hospital Administrator + System Administrator (READMISSION_FORECAST_READ).
  const forecast = can(user, 'readmission_forecast:read')
    ? await apiFetch<ReadmissionForecast>('/risk/forecast', { cache: 'no-store' }, token).catch(
        () => null,
      )
    : null;

  const shortcuts = [
    ...(can(user, 'patient:read_assigned') || can(user, 'patient:read_all')
      ? [{ href: '/dashboard/patients', label: 'View patients' }]
      : []),
    ...(can(user, 'user:manage') ? [{ href: '/dashboard/users', label: 'Manage users' }] : []),
    ...insightLinks(user),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${user.profile ? `, ${user.profile.full_name}` : ''}`}
        description={
          user.role === 'doctor'
            ? 'You are seeing the patients assigned to you.'
            : 'You are seeing hospital-wide data your role permits.'
        }
        actions={shortcuts.map((link) => (
          <Link key={link.href} href={link.href} className="btn btn-secondary btn-sm">
            {link.label}
          </Link>
        ))}
      />

      <MetricStrip label="Account summary">
        <StatTile
          variant="plain"
          label={user.role === 'doctor' ? 'Assigned patients' : 'Patients'}
          value={patientCount ?? '-'}
        />
        <StatTile variant="plain" label="Role" value={roleLabel(user.role)} />
        <StatTile variant="plain" label="Permissions" value={user.permissions.length} />
      </MetricStrip>

      {unreachable && (
        <Card title="Backend unavailable">
          <p className="text-sm text-ink-muted">
            The API did not respond. Start it with{' '}
            <code className="rounded bg-ink/10 px-1 text-ink">uvicorn app.main:app --reload</code> in{' '}
            <code className="rounded bg-ink/10 px-1 text-ink">backend/</code>.
          </p>
        </Card>
      )}

      {forecast && (
        <Card title="30-day readmission scores (scored patients only)">
          <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-center">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:border-r lg:border-rule lg:pr-6">
              <StatTile
                variant="bare"
                label="Scored patients at or above 0.50"
                value={forecast.predicted_readmissions}
              />
              <StatTile
                variant="bare"
                label="Share of scored patients"
                value={`${(forecast.predicted_rate * 100).toFixed(0)}%`}
              />
            </div>
            <ForecastChart
              predicted={forecast.predicted_readmissions}
              total={
                forecast.predicted_rate > 0
                  ? Math.round(forecast.predicted_readmissions / forecast.predicted_rate)
                  : forecast.predicted_readmissions
              }
            />
          </div>
          <div className="mt-5 space-y-1.5 border-t border-rule pt-4">
            <p className="text-sm text-ink-muted">
              Patients included: scored patients visible to your role (
              {forecast.scope === 'doctor' ? 'your assigned patients' : 'hospital-wide'})
            </p>
            <p className="text-sm text-ink-muted">Horizon: {forecast.horizon_days} days</p>
            <ScoreNote>{SCORE_NOTES.aggregateForecast}</ScoreNote>
          </div>
        </Card>
      )}

      {can(user, 'risk_report:read') && (
        <Card title="High-risk patients">
          <div className="mb-5 space-y-1">
            <ScoreNote>{SCORE_NOTES.riskScore}</ScoreNote>
            <ScoreNote>{SCORE_NOTES.bands}</ScoreNote>
          </div>
          <Table
            headers={['Patient', 'Risk', 'Model score', 'Scored']}
            empty="No scored patient is currently in the high band. Patients who have not been scored are not shown."
          >
            {highRiskPatients.map((prediction) => (
              <Row key={prediction.id}>
                <Cell>
                  <Link href={`/dashboard/patients/${prediction.patient_id}`} className="link">
                    Patient #{prediction.patient_id}
                  </Link>
                </Cell>
                <Cell>
                  <RiskBadge category={prediction.risk_category} />
                </Cell>
                <Cell>
                  <div className="flex items-center gap-3">
                    <RiskScoreBar
                      size="sm"
                      probability={prediction.readmission_probability}
                      category={prediction.risk_category}
                    />
                    <span className="font-semibold tabular-nums">
                      {formatModelScore(prediction.readmission_probability)}
                    </span>
                  </div>
                </Cell>
                <Cell>{formatDate(prediction.created_at)}</Cell>
              </Row>
            ))}
          </Table>
        </Card>
      )}

      <Card
        title="Your access"
        description="The actions the backend allows your role. Every request is checked again by the server."
      >
        <ul className="grid gap-x-8 gap-y-1.5 text-sm text-ink sm:grid-cols-2 lg:grid-cols-3">
          {user.permissions.map((permission) => (
            <li key={permission} className="break-words">
              {permission}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
