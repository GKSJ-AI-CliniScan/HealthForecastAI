'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type {
  HospitalAnalyticsSummary,
  LoginResponse,
  MonthlyReadmissions,
  Patient,
  ReadmissionForecast,
  RiskPrediction,
  TreatmentSummary,
} from '@/types';

interface DashboardProps {
  session: LoginResponse;
  onLogout: () => void;
}

interface DashboardData {
  summary?: HospitalAnalyticsSummary;
  series?: MonthlyReadmissions[];
  forecast?: ReadmissionForecast;
  highRisk?: RiskPrediction[];
  treatments?: TreatmentSummary[];
  patients?: Patient[];
}

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Calls an endpoint and returns undefined when this role is not allowed to see it. */
async function tryFetch<T>(path: string, token: string): Promise<T | undefined> {
  try {
    return await apiFetch<T>(path, {}, token);
  } catch {
    return undefined;
  }
}

export function Dashboard({ session, onLogout }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const token = session.access_token;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [summary, series, forecast, highRisk, treatments, patients] = await Promise.all([
        tryFetch<HospitalAnalyticsSummary>('/analytics/summary', token),
        tryFetch<MonthlyReadmissions[]>('/analytics/readmissions', token),
        tryFetch<ReadmissionForecast>('/risk/forecast?horizon_days=30', token),
        tryFetch<RiskPrediction[]>('/risk/high-risk', token),
        tryFetch<TreatmentSummary[]>('/treatment', token),
        tryFetch<Patient[]>('/patients', token),
      ]);
      if (!cancelled) {
        setData({ summary, series, forecast, highRisk, treatments, patients });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const maxRate = Math.max(0.01, ...(data?.series ?? []).map((row) => row.readmission_rate));

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Signed in as <strong>{session.role.replace('_', ' ')}</strong>. Only the panels your role
          may see are shown.
        </p>
        <button
          onClick={onLogout}
          className="rounded border border-[var(--border)] px-3 py-1 text-sm"
        >
          Sign out
        </button>
      </div>

      {data === null ? <p>Loading...</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.summary ? (
          <Card title="Hospital summary">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt>Patients</dt>
              <dd className="text-right font-medium">{data.summary.total_patients}</dd>
              <dt>Readmission rate</dt>
              <dd className="text-right font-medium">{percent(data.summary.readmission_rate)}</dd>
              <dt>Average stay (days)</dt>
              <dd className="text-right font-medium">{data.summary.average_length_of_stay}</dd>
              <dt>Low / medium / high risk</dt>
              <dd className="text-right font-medium">
                {data.summary.risk_distribution.low} / {data.summary.risk_distribution.medium} /{' '}
                {data.summary.risk_distribution.high}
              </dd>
            </dl>
          </Card>
        ) : null}

        {data?.forecast ? (
          <Card title={`Forecast, next ${data.forecast.horizon_days} days (${data.forecast.scope})`}>
            <p className="text-3xl font-bold">{data.forecast.predicted_readmissions}</p>
            <p className="text-sm text-slate-500">
              expected readmissions, predicted rate {percent(data.forecast.predicted_rate)}
            </p>
          </Card>
        ) : null}

        {data?.series ? (
          <Card title="Readmission rate by month">
            <ul className="space-y-1 text-xs">
              {data.series.map((row) => (
                <li key={row.month} className="flex items-center gap-2">
                  <span className="w-16 shrink-0">{row.month}</span>
                  <span
                    className="h-3 rounded bg-blue-500"
                    style={{ width: `${(row.readmission_rate / maxRate) * 100}%` }}
                  />
                  <span>{percent(row.readmission_rate)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {data?.treatments ? (
          <Card title="Treatment effectiveness">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th>Treatment</th>
                  <th className="text-right">Patients</th>
                  <th className="text-right">Recovery</th>
                  <th className="text-right">Readmit</th>
                </tr>
              </thead>
              <tbody>
                {data.treatments.map((row) => (
                  <tr key={row.treatment_name}>
                    <td>{row.treatment_name}</td>
                    <td className="text-right">{row.patients_treated}</td>
                    <td className="text-right">{row.average_recovery_score}</td>
                    <td className="text-right">{percent(row.readmission_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : null}

        {data?.highRisk ? (
          <Card title={`High risk patients (${data.highRisk.length})`}>
            <ul className="max-h-64 space-y-1 overflow-auto text-sm">
              {data.highRisk.map((row) => (
                <li key={row.patient_id} className="flex justify-between">
                  <span>Patient #{row.patient_id}</span>
                  <span className="font-medium text-red-600">
                    {percent(row.readmission_probability)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {data?.patients ? (
          <Card title={`Patients (${data.patients.length})`}>
            <ul className="max-h-64 space-y-1 overflow-auto text-sm">
              {data.patients.map((row) => (
                <li key={row.id} className="flex justify-between">
                  <span>{row.medical_record_number}</span>
                  <span className="text-slate-500">{row.primary_diagnosis}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
