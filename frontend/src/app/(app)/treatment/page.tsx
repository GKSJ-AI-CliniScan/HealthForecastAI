'use client';

import { KpiCard } from '@/components/ui/KpiCard';
import { ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import type { MedicationOutcome, RecoveryGroup, RecoveryReport, TreatmentReport } from '@/types';

const pct = (v: number | undefined) => (v === undefined ? '—' : `${(v * 100).toFixed(1)}%`);

function verdict(m: MedicationOutcome): { text: string; colour: string } {
  if (!m.effect) return { text: 'Too few patients', colour: 'var(--muted)' };
  if (!m.effect.significant) return { text: 'No clear difference', colour: 'var(--muted)' };
  return m.effect.adjusted_odds_ratio > 1
    ? { text: 'Higher readmission odds', colour: '#8a1c12' }
    : { text: 'Lower readmission odds', colour: '#0f7b39' };
}

function RecoveryTable({ title, rows }: { title: string; rows: RecoveryGroup[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="table-wrap">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="th">Group</th>
              <th className="th">Admissions</th>
              <th className="th">Stable recovery</th>
              <th className="th">No readmission</th>
              <th className="th">Home discharge</th>
              <th className="th">Avg stay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.group}>
                <td className="td font-medium">{r.group}</td>
                <td className="td">{r.n.toLocaleString()}</td>
                {r.suppressed ? (
                  <td className="td muted" colSpan={4}>
                    Suppressed: too few patients to report safely
                  </td>
                ) : (
                  <>
                    <td className="td">
                      {pct(r.stable_recovery?.rate)}{' '}
                      <span className="muted text-xs">
                        ({pct(r.stable_recovery?.ci_low)}–{pct(r.stable_recovery?.ci_high)})
                      </span>
                    </td>
                    <td className="td">{pct(r.no_readmission_rate)}</td>
                    <td className="td">{pct(r.home_discharge_rate)}</td>
                    <td className="td">{r.average_length_of_stay ?? '—'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function TreatmentPage() {
  const treatment = useApi<TreatmentReport>('/treatment');
  const recovery = useApi<RecoveryReport>('/treatment/recovery');

  const error = treatment.error ?? recovery.error;
  if (error) return <ErrorBlock message={error} />;
  if (treatment.loading || recovery.loading) return <Loading />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Treatment effectiveness</h1>
        <p className="muted mt-1 text-sm">
          Medication outcomes and recovery, for {treatment.data?.scope ?? 'your patients'}.
        </p>
      </header>

      {treatment.data ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: '#fff4e5', color: '#8a5300' }}
          role="note"
        >
          {treatment.data.caveat}
        </div>
      ) : null}

      {recovery.data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Stable recovery"
              value={pct(recovery.data.overall.stable_recovery?.rate)}
              hint="A proxy - see the definition below"
              tone="good"
            />
            <KpiCard
              label="No readmission"
              value={pct(recovery.data.overall.no_readmission_rate)}
            />
            <KpiCard
              label="Home discharge"
              value={pct(recovery.data.overall.home_discharge_rate)}
            />
          </section>
          <p className="muted text-xs">{recovery.data.definition}</p>
        </>
      ) : null}

      {treatment.data ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Medication outcome analysis</h2>
          <p className="muted text-sm">
            Adjusted for {treatment.data.adjusted_for.join(' and ')}. The odds ratio compares
            treated with untreated patients in the same age and prior-admission group.
          </p>
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Medication</th>
                  <th className="th">Treated</th>
                  <th className="th">Readmit (treated)</th>
                  <th className="th">Readmit (not)</th>
                  <th className="th">Adjusted odds ratio</th>
                  <th className="th">Reading</th>
                </tr>
              </thead>
              <tbody>
                {treatment.data.medications.map((m) => {
                  const v = verdict(m);
                  return (
                    <tr key={m.treatment_name}>
                      <td className="td font-medium">{m.treatment_name}</td>
                      <td className="td">{m.patients_treated.toLocaleString()}</td>
                      <td className="td">{pct(m.treated?.rate)}</td>
                      <td className="td">{pct(m.not_treated?.rate)}</td>
                      <td className="td">
                        {m.effect ? (
                          <>
                            {m.effect.adjusted_odds_ratio.toFixed(2)}{' '}
                            <span className="muted text-xs">
                              ({m.effect.adjusted_ci[0].toFixed(2)}–
                              {m.effect.adjusted_ci[1].toFixed(2)})
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="td" style={{ color: v.colour }}>
                        {v.text}
                        {m.effect?.confounding_flag ? ' · confounded' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {recovery.data ? (
        <>
          <RecoveryTable title="Recovery by age group" rows={recovery.data.by_age_group} />
          <RecoveryTable title="Recovery by diagnosis" rows={recovery.data.by_diagnosis_group} />
        </>
      ) : null}
    </div>
  );
}
