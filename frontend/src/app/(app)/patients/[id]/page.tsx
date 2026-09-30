'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { KpiCard } from '@/components/ui/KpiCard';
import { RiskBadge, RiskMeter } from '@/components/ui/RiskBadge';
import { EmptyBlock, ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/lib/auth';
import type { PatientDetail, PatientRiskScore, Recommendations } from '@/types';

const READMISSION_LABEL: Record<string, string> = {
  '<30': 'Readmitted within 30 days',
  '>30': 'Readmitted after 30 days',
  NO: 'Not readmitted',
};

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, error, loading } = useApi<PatientDetail>(`/patients/${params.id}`);
  // A 404 here just means this patient has not been scored yet, which is a
  // normal state - the page renders without the risk panel.
  const risk = useApi<PatientRiskScore>(`/risk/patients/${params.id}`);
  const { can } = useAuth();
  // Care recommendations are a clinician feature; other roles never request them.
  const care = useApi<Recommendations>(
    can('care_recommendation:generate') ? `/clinical-support/recommendations/${params.id}` : null,
  );

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBlock
          message={error.includes('not found') ? 'This patient is not in your caseload.' : error}
        />
        <Link href="/patients" className="btn-ghost">
          Back to patients
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const readmitted30 = data.admissions.filter((a) => a.readmitted === '<30').length;
  const averageStay =
    data.admissions.length > 0
      ? (
          data.admissions.reduce((sum, a) => sum + (a.time_in_hospital ?? 0), 0) /
          data.admissions.length
        ).toFixed(1)
      : '—';

  return (
    <div className="space-y-8">
      <header>
        <Link href="/patients" className="muted text-sm">
          ← Patients
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{data.medical_record_number}</h1>
        <p className="muted mt-1 text-sm">
          {[data.age_group, data.gender, data.race].filter(Boolean).join(' · ') ||
            'No demographics recorded'}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Admissions" value={data.admissions.length} />
        <KpiCard
          label="30-day readmissions"
          value={readmitted30}
          tone={readmitted30 > 0 ? 'warn' : 'good'}
        />
        <KpiCard label="Average stay" value={`${averageStay} days`} />
      </section>

      {risk.data ? (
        <section className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">30-day readmission risk</h2>
              <p className="muted mt-1 text-sm">
                {risk.data.model_name} v{risk.data.model_version}
                {risk.data.flagged ? ' · flagged for review' : ' · below the review threshold'}
              </p>
            </div>
            <RiskBadge category={risk.data.risk_category} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div>
              <p className="muted text-xs font-semibold uppercase tracking-wide">Probability</p>
              <p className="mt-1 text-3xl font-semibold">
                {(risk.data.readmission_probability * 100).toFixed(1)}%
              </p>
            </div>
            <div className="min-w-40">
              <p className="muted text-xs font-semibold uppercase tracking-wide">
                Against the cohort
              </p>
              <div className="mt-2">
                <RiskMeter probability={risk.data.readmission_probability} />
              </div>
            </div>
            <div>
              <p className="muted text-xs font-semibold uppercase tracking-wide">
                Review threshold
              </p>
              <p className="mt-1 text-sm tabular-nums">
                {(risk.data.decision_threshold * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <p className="muted mt-4 text-xs">
            The baseline 30-day readmission rate across this record is 9.0%. A high-risk patient
            runs roughly three times that.
          </p>
        </section>
      ) : null}

      <section className="card">
        <h2 className="text-lg font-semibold">Clinical summary</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="muted text-xs font-semibold uppercase tracking-wide">
              Primary diagnosis group
            </dt>
            <dd className="mt-1 text-sm">{data.primary_diagnosis ?? '—'}</dd>
          </div>
          <div>
            <dt className="muted text-xs font-semibold uppercase tracking-wide">Assigned doctor</dt>
            <dd className="mt-1 text-sm">
              {data.assigned_doctor_id ? `User #${data.assigned_doctor_id}` : 'Unassigned'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Admission history</h2>
        {data.admissions.length === 0 ? (
          <EmptyBlock message="No admissions recorded for this patient." />
        ) : (
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Type</th>
                  <th className="th">Stay (days)</th>
                  <th className="th">Medications</th>
                  <th className="th">Lab procedures</th>
                  <th className="th">Diagnoses</th>
                  <th className="th">Discharge</th>
                  <th className="th">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {data.admissions.map((admission) => (
                  <tr key={admission.id}>
                    <td className="td">{admission.admission_type ?? '—'}</td>
                    <td className="td">{admission.time_in_hospital ?? '—'}</td>
                    <td className="td">{admission.num_medications ?? '—'}</td>
                    <td className="td">{admission.num_lab_procedures ?? '—'}</td>
                    <td className="td">{admission.number_diagnoses ?? '—'}</td>
                    <td className="td">{admission.discharge_disposition ?? '—'}</td>
                    <td className="td">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background:
                            admission.readmitted === '<30' ? '#fdecea' : 'var(--surface-muted)',
                          color: admission.readmitted === '<30' ? '#8a1c12' : 'var(--muted)',
                        }}
                      >
                        {READMISSION_LABEL[admission.readmitted ?? ''] ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {care.data ? (
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Suggested care actions</h2>
            <p className="muted mt-1 text-sm">
              {care.data.follow_up_days
                ? `Suggested follow-up within ${care.data.follow_up_days} days. `
                : ''}
              {care.data.risk?.times_the_average_patient
                ? `Predicted risk is ${care.data.risk.times_the_average_patient}x the average patient.`
                : ''}
            </p>
          </div>
          <ul className="space-y-3">
            {care.data.recommendations.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border p-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="text-sm font-medium">
                  {r.action}{' '}
                  <span className="muted text-xs font-normal">
                    · {r.category} · {r.timing} · {r.priority}
                  </span>
                </p>
                <p className="muted mt-1 text-xs">{r.rationale}</p>
              </li>
            ))}
          </ul>
          {care.data.explanation ? (
            <div>
              <h3 className="text-sm font-semibold">What drives this score</h3>
              <p className="muted mt-1 text-xs">
                Each factor is scored on its own: the change in this patient&apos;s score if only
                that factor took a typical value. The figures do not add up to the total.
              </p>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <ul className="space-y-1 text-sm">
                  {care.data.explanation.up.map((f) => (
                    <li key={f.feature} style={{ color: '#8a1c12' }}>
                      ▲ {f.feature.replace(/_/g, ' ')}
                      {f.value !== null && !f.imputed ? ` (${f.value})` : ''} · x{f.odds_ratio}
                    </li>
                  ))}
                </ul>
                <ul className="space-y-1 text-sm">
                  {care.data.explanation.down.map((f) => (
                    <li key={f.feature} style={{ color: '#0f7b39' }}>
                      ▼ {f.feature.replace(/_/g, ' ')}
                      {f.value !== null && !f.imputed ? ` (${f.value})` : ''} · x{f.odds_ratio}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          <p className="muted text-xs">{care.data.disclaimer}</p>
        </section>
      ) : null}
    </div>
  );
}
