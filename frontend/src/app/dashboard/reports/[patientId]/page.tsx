import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Card, Cell, EmptyNote, ErrorNote, RiskBadge, Row, StatTile, Table } from '@/components/ui';
import { ApiError, apiFetch } from '@/lib/api';
import { getToken, requireUser } from '@/lib/session';
import type { PatientRiskReport, RiskCategory } from '@/types';

export const dynamic = 'force-dynamic';

function formatPercent(value: number | null): string {
  return value === null ? '-' : `${(value * 100).toFixed(1)}%`;
}

/** Render a UTC timestamp without letting JavaScript reinterpret it as local. */
function formatTimestamp(value: string | null): string {
  if (!value) {
    return '-';
  }
  const normalised = /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

/** A plain-date string (no time component) needs no timezone correction. */
function formatDate(value: string | null): string {
  return value ?? '-';
}

const BAND_SUMMARY: Record<RiskCategory, string> = {
  high: 'Prioritise for discharge planning and follow-up.',
  medium: 'Monitor and reassess before discharge.',
  low: 'No elevated readmission risk indicated.',
};

/** Left border colour for the risk summary, matching the band. */
const BAND_BORDER: Record<RiskCategory, string> = {
  high: 'border-l-risk-high',
  medium: 'border-l-risk-medium',
  low: 'border-l-risk-low',
};

/**
 * Per-patient readmission risk report - SRS FR-RPT-03.
 *
 * Scope is enforced by the backend: a patient outside the caller's caseload
 * returns 404, the same response a missing patient gives, so this page cannot
 * confirm that an out-of-scope record exists.
 */
export default async function PatientReportPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  await requireUser();
  const token = await getToken();
  const { patientId } = await params;

  let report: PatientRiskReport | null = null;
  let error: string | null = null;

  try {
    report = await apiFetch<PatientRiskReport>(
      `/reports/patients/${patientId}`,
      { cache: 'no-store' },
      token,
    );
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) {
      // Missing or out of scope - indistinguishable by design.
      notFound();
    }
    if (caught instanceof ApiError && caught.status === 403) {
      error = 'Your role receives aggregated reports only, so this patient report is not available.';
    } else if (caught instanceof ApiError) {
      error = `The reporting service returned an error (${caught.status}).`;
    } else {
      error = 'Could not reach the reporting service. Is the backend running?';
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <Link href="/dashboard/reports" className="text-sm underline underline-offset-2">
          Back to reports
        </Link>
      </div>
    );
  }

  if (!report) {
    return <EmptyNote>No report was returned for this patient.</EmptyNote>;
  }

  const band = report.risk_category;
  const isScored = band !== null && report.readmission_probability !== null;
  const readmissionLabels = Object.entries(report.readmissions_by_label);

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{report.medical_record_number}</h1>
          <p className="mt-1 text-sm opacity-70">
            Readmission risk report &middot; generated {formatTimestamp(report.metadata.generated_at)}
          </p>
          <p className="mt-1 text-xs opacity-60">
            De-identified record. No name, address or date of birth is stored.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/dashboard/patients/${report.patient_id}`}
            className="rounded-md border border-[var(--border)] px-3 py-1.5"
          >
            Patient record
          </Link>
          <Link
            href="/dashboard/reports"
            className="rounded-md border border-[var(--border)] px-3 py-1.5"
          >
            All reports
          </Link>
        </div>
      </header>

      {/* ---- Risk section: the headline clinical judgement ---- */}
      <section
        aria-labelledby="risk-heading"
        className={`rounded-lg border border-l-4 border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm ${
          isScored && band ? BAND_BORDER[band] : 'border-l-[var(--border)]'
        }`}
      >
        <h2 id="risk-heading" className="text-sm font-semibold uppercase tracking-wide opacity-70">
          Readmission risk
        </h2>
        {!isScored ? (
          <div className="mt-3">
            <EmptyNote>
              This patient has no stored risk prediction, so no score can be shown. Scoring them
              through the risk API will populate this section.
            </EmptyNote>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <p className="text-4xl font-semibold tabular-nums">
              {formatPercent(report.readmission_probability)}
            </p>
            <div className="flex items-center gap-2">
              {band && <RiskBadge band={band} />}
              <span className="text-sm opacity-70">{band && BAND_SUMMARY[band]}</span>
            </div>
            <p className="w-full text-xs opacity-60">
              Scored {formatTimestamp(report.scored_at)} by {report.model_name} (
              {report.model_version}). Probability of readmission within 30 days of discharge.
            </p>
          </div>
        )}
      </section>

      {/* ---- Risk factors: the most important section ---- */}
      <section aria-labelledby="factors-heading" className="space-y-3">
        <h2 id="factors-heading" className="text-sm font-semibold uppercase tracking-wide opacity-70">
          Why this patient is at risk
        </h2>
        {report.risk_factors.length === 0 ? (
          <EmptyNote>No contributing factors were identified from the recorded data.</EmptyNote>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {report.risk_factors.map((factor) => (
              <li
                key={factor.factor}
                className={`rounded-lg border border-l-4 border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm ${
                  isScored && band === 'high' ? 'border-l-risk-high' : 'border-l-[var(--border)]'
                }`}
              >
                <p className="font-semibold">{factor.factor}</p>
                <p className="mt-1 text-sm opacity-70">{factor.detail}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs opacity-60">
          Factors are derived from the patient&apos;s recorded history using clinical rules, not from
          model feature attribution. They explain the context around the score rather than the
          model&apos;s internal weighting.
        </p>
      </section>

      {/* ---- Clinical summary ---- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Patient details">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="opacity-60">Patient ID</dt>
              <dd className="tabular-nums">{report.patient_id}</dd>
            </div>
            <div>
              <dt className="opacity-60">Record number</dt>
              <dd>{report.medical_record_number}</dd>
            </div>
            <div>
              <dt className="opacity-60">Age group</dt>
              <dd>{report.age_group ?? '-'}</dd>
            </div>
            <div>
              <dt className="opacity-60">Gender</dt>
              <dd>{report.gender ?? '-'}</dd>
            </div>
            <div>
              <dt className="opacity-60">Primary diagnosis</dt>
              <dd>{report.primary_diagnosis ?? '-'}</dd>
            </div>
            <div>
              <dt className="opacity-60">Assigned doctor</dt>
              <dd>{report.assigned_doctor_id ?? 'Unassigned'}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Admission history">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Admissions" value={report.total_admissions} />
            <StatTile
              label="Readmissions"
              value={report.readmitted_total}
              tone={report.readmitted_total > 0 ? 'alert' : 'default'}
            />
            <StatTile label="Average stay" value={`${report.average_length_of_stay} d`} />
          </div>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="opacity-60">Last admission</dt>
              <dd>{formatDate(report.last_admission_date)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* ---- Readmission outcomes ---- */}
      <Card title="Readmission outcomes">
        {readmissionLabels.length === 0 ? (
          <EmptyNote>No admissions are recorded for this patient.</EmptyNote>
        ) : (
          <Table headers={['Outcome label', 'Admissions']}>
            {readmissionLabels.map(([label, count]) => (
              <Row key={label}>
                <Cell>
                  {label === '<30'
                    ? 'Readmitted within 30 days'
                    : label === '>30'
                      ? 'Readmitted after 30 days'
                      : label === 'NO'
                        ? 'Not readmitted'
                        : label}
                </Cell>
                <Cell>{count}</Cell>
              </Row>
            ))}
          </Table>
        )}
        <p className="mt-4 text-xs opacity-60">
          Labels are preserved from the source dataset so the readmission window is not lost.
        </p>
      </Card>

      {/* ---- Data notes ---- */}
      {report.metadata.notes.length > 0 && (
        <Card title="Data notes">
          <ul className="space-y-1 text-sm opacity-70">
            {report.metadata.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
