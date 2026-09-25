'use client';

import { useEffect, useState } from 'react';

type RiskRow = {
  risk_band: string;
  patients: number;
  no_readmission: number;
  readmitted_after_30: number;
  readmitted_under_30: number;
};

type TrendRow = {
  time_in_hospital: number;
  patients: number;
  readmission_rate: number;
  readmitted_under_30: number;
};

export default function HealthcareAnalytics() {
  const [riskData, setRiskData] = useState<RiskRow[]>([]);
  const [trendData, setTrendData] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [riskResponse, trendResponse] = await Promise.all([
          fetch('/data/risk_outcome_analysis.json'),
          fetch('/data/readmission_trend.json'),
        ]);

        if (!riskResponse.ok || !trendResponse.ok) {
          throw new Error('Failed to load analytics data');
        }

        const riskResult =
          (await riskResponse.json()) as RiskRow[];

        const trendResult =
          (await trendResponse.json()) as TrendRow[];

        setRiskData(riskResult);
        setTrendData(trendResult);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-slate-500">
          Loading healthcare analytics...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">
          Unable to load healthcare analytics.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          Healthcare Analytics
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Healthcare Performance Dashboard
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Readmission outcomes, risk-band performance and hospital-stay
          monitoring.
        </p>
      </div>

      {/* Risk Band Performance */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="p-6">
          <h3 className="text-lg font-semibold">
            Risk Band Performance
          </h3>
        </div>

        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-y border-[var(--border)]">
            <tr>
              <th className="px-5 py-4 font-semibold">
                Risk Band
              </th>
              <th className="px-5 py-4 font-semibold">
                Patients
              </th>
              <th className="px-5 py-4 font-semibold">
                No Readmission
              </th>
              <th className="px-5 py-4 font-semibold">
                After 30 Days
              </th>
              <th className="px-5 py-4 font-semibold">
                Within 30 Days
              </th>
            </tr>
          </thead>

          <tbody>
            {riskData.map((row) => (
              <tr
                key={row.risk_band}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-5 py-4 font-medium">
                  {row.risk_band}
                </td>

                <td className="px-5 py-4">
                  {row.patients.toLocaleString()}
                </td>

                <td className="px-5 py-4">
                  {row.no_readmission.toFixed(1)}%
                </td>

                <td className="px-5 py-4">
                  {row.readmitted_after_30.toFixed(1)}%
                </td>

                <td className="px-5 py-4">
                  {row.readmitted_under_30.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trend Monitoring */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="p-6">
          <h3 className="text-lg font-semibold">
            Readmission Trend by Length of Stay
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Observed readmission rate across hospital stay duration.
          </p>
        </div>

        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-y border-[var(--border)]">
            <tr>
              <th className="px-5 py-4 font-semibold">
                Hospital Stay
              </th>
              <th className="px-5 py-4 font-semibold">
                Patients
              </th>
              <th className="px-5 py-4 font-semibold">
                Readmission Rate
              </th>
              <th className="px-5 py-4 font-semibold">
                Within 30 Days
              </th>
            </tr>
          </thead>

          <tbody>
            {trendData.map((row) => (
              <tr
                key={row.time_in_hospital}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-5 py-4 font-medium">
                  {row.time_in_hospital} days
                </td>

                <td className="px-5 py-4">
                  {row.patients.toLocaleString()}
                </td>

                <td className="px-5 py-4">
                  {row.readmission_rate.toFixed(1)}%
                </td>

                <td className="px-5 py-4">
                  {row.readmitted_under_30.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
