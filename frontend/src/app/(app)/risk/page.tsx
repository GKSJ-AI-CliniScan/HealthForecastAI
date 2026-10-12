'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RateBarChart } from '@/components/charts/RateBarChart';
import { KpiCard } from '@/components/ui/KpiCard';
import { RiskBadge, RiskMeter } from '@/components/ui/RiskBadge';
import { EmptyBlock, ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import type {
  CalibrationReport,
  ReadmissionForecast,
  RiskCategory,
  RiskDriver,
  ScoredPatientPage,
} from '@/types';

const PAGE_SIZE = 25;
const BANDS: RiskCategory[] = ['high', 'medium', 'low'];

export default function RiskPage() {
  const [band, setBand] = useState<RiskCategory>('high');
  const [offset, setOffset] = useState(0);

  const forecast = useApi<ReadmissionForecast>('/risk/forecast?horizon_days=30');
  const cohort = useApi<ScoredPatientPage>(
    `/risk/high-risk?category=${band}&limit=${PAGE_SIZE}&offset=${offset}`,
  );
  const drivers = useApi<RiskDriver[]>('/risk/drivers?limit=10');
  const calibration = useApi<CalibrationReport>('/risk/calibration');

  const modelMissing =
    forecast.error?.includes('No risk model') || cohort.error?.includes('No risk model');

  if (modelMissing) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Risk prediction</h1>
        <EmptyBlock message="No risk model is loaded. Train one with: cd ml && python -m src.models.train" />
      </div>
    );
  }

  const error = forecast.error ?? cohort.error;
  const distribution = forecast.data?.risk_distribution;
  const bandChart = distribution
    ? BANDS.map((name) => ({ band: name, patients: distribution[name] ?? 0 }))
    : [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Risk prediction</h1>
        <p className="muted mt-1 text-sm">
          30-day readmission risk from the promoted model
          {forecast.data?.model_version ? ` (v${forecast.data.model_version})` : ''}.
        </p>
      </header>

      {error ? <ErrorBlock message={error} /> : null}

      {forecast.data ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Patients scored"
            value={forecast.data.patients_scored.toLocaleString()}
            hint={forecast.data.scope === 'caseload' ? 'Your caseload' : 'Hospital wide'}
          />
          <KpiCard
            label="Expected readmissions"
            value={Math.round(forecast.data.expected_readmissions).toLocaleString()}
            hint={`Next ${forecast.data.horizon_days} days`}
            tone="warn"
          />
          <KpiCard
            label="Expected rate"
            value={`${(forecast.data.expected_rate * 100).toFixed(2)}%`}
          />
          <KpiCard
            label="High risk"
            value={(distribution?.high ?? 0).toLocaleString()}
            hint="Needing review"
            tone="warn"
          />
        </section>
      ) : null}

      {forecast.data ? (
        <p className="muted text-xs">
          Expected readmissions sum the individual probabilities rather than counting
          flagged patients — that is the unbiased estimate of how many events occur.
          Counting everyone above the review threshold answers a different question and
          overstates the total.
        </p>
      ) : null}

      {bandChart.length > 0 ? (
        <section className="card">
          <h2 className="text-lg font-semibold">Patients per risk band</h2>
          <RateBarChart
            data={bandChart as unknown as Record<string, unknown>[]}
            xKey="band"
            yKey="patients"
            height={220}
          />
        </section>
      ) : null}

      {calibration.data && calibration.data.bands.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Calibration: predicted against observed</h2>
          <p className="muted text-sm">
            If these two columns drift apart, the model needs retraining.
          </p>
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Band</th>
                  <th className="th">Patients</th>
                  <th className="th">Predicted rate</th>
                  <th className="th">Observed rate</th>
                </tr>
              </thead>
              <tbody>
                {calibration.data.bands.map((row) => (
                  <tr key={row.risk_category}>
                    <td className="td">
                      <RiskBadge category={row.risk_category} />
                    </td>
                    <td className="td">{row.patients.toLocaleString()}</td>
                    <td className="td">{(row.predicted_rate * 100).toFixed(1)}%</td>
                    <td className="td">{(row.observed_rate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Patients by risk band</h2>
          <div className="flex gap-1">
            {BANDS.map((name) => (
              <button
                key={name}
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition"
                style={{
                  background: band === name ? 'var(--accent-soft)' : 'transparent',
                  color: band === name ? 'var(--accent)' : 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
                onClick={() => {
                  setBand(name);
                  setOffset(0);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {cohort.loading ? <Loading /> : null}

        {cohort.data && cohort.data.items.length === 0 ? (
          <EmptyBlock
            message={`No patients are currently in the ${band} risk band. Run the batch scorer: cd ml && python -m src.models.score --replace`}
          />
        ) : null}

        {cohort.data && cohort.data.items.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="th">MRN</th>
                    <th className="th">Age band</th>
                    <th className="th">Primary diagnosis</th>
                    <th className="th">Readmission probability</th>
                    <th className="th">Band</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {cohort.data.items.map((row) => (
                    <tr key={row.patient_id}>
                      <td className="td font-medium">{row.medical_record_number}</td>
                      <td className="td">{row.age_group ?? '—'}</td>
                      <td className="td">{row.primary_diagnosis ?? '—'}</td>
                      <td className="td">
                        <RiskMeter probability={row.readmission_probability} />
                      </td>
                      <td className="td">
                        <RiskBadge category={row.risk_category} />
                      </td>
                      <td className="td text-right">
                        <Link
                          href={`/patients/${row.patient_id}`}
                          className="text-sm font-medium"
                          style={{ color: 'var(--accent)' }}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="muted text-sm">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, cohort.data.total)} of{' '}
                {cohort.data.total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={offset + PAGE_SIZE >= cohort.data.total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {drivers.data && drivers.data.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">What the model keys on</h2>
          <p className="muted text-sm">
            Global drivers for the promoted model. Per-patient attribution arrives with
            clinical decision support in Milestone 3.
          </p>
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Feature</th>
                  <th className="th">Weight</th>
                  <th className="th">Direction</th>
                </tr>
              </thead>
              <tbody>
                {drivers.data.map((driver) => (
                  <tr key={driver.feature}>
                    <td className="td font-mono text-xs">{driver.feature}</td>
                    <td className="td tabular-nums">{driver.weight.toFixed(4)}</td>
                    <td className="td">{driver.direction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
