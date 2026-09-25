'use client';

import { useEffect, useMemo, useState } from 'react';

type RiskTreatmentRow = {
  risk_band: 'Low' | 'Medium' | 'High';
  patients: number;
  no_readmission: number;
  readmitted_under_30: number;
  medication: string;
};

export default function RiskTreatmentProfile() {
  const [data, setData] = useState<RiskTreatmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(
          '/data/risk_treatment_summary.json',
        );

        if (!response.ok) {
          throw new Error('Failed to load risk-treatment data');
        }

        const result = (await response.json()) as RiskTreatmentRow[];
        setData(result);
      } catch {
        setError('Unable to load risk-treatment analysis.');
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const medications = useMemo(
    () => [...new Set(data.map((item) => item.medication))],
    [data],
  );

  if (loading) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-slate-500">
          Loading risk-treatment analysis...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          Risk × Treatment
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Observed Risk × Treatment Profile
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Observed readmission outcomes across risk bands and medication
          groups. Groups with fewer than 100 patients were excluded.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-slate-500">Treatments analysed</p>
          <p className="mt-2 text-3xl font-bold">
            {medications.length}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-slate-500">Risk bands</p>
          <p className="mt-2 text-3xl font-bold">
            {new Set(data.map((item) => item.risk_band)).size}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-slate-500">Profiles analysed</p>
          <p className="mt-2 text-3xl font-bold">
            {data.length}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--border)]">
            <tr>
              <th className="px-5 py-4 font-semibold">Treatment</th>
              <th className="px-5 py-4 font-semibold">Risk Band</th>
              <th className="px-5 py-4 font-semibold">Patients</th>
              <th className="px-5 py-4 font-semibold">
                No Readmission
              </th>
              <th className="px-5 py-4 font-semibold">
                Readmitted &lt;30 Days
              </th>
            </tr>
          </thead>

          <tbody>
            {data.map((item) => (
              <tr
                key={`${item.medication}-${item.risk_band}`}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-5 py-4 font-medium capitalize">
                  {item.medication}
                </td>

                <td className="px-5 py-4">
                  {item.risk_band}
                </td>

                <td className="px-5 py-4">
                  {item.patients.toLocaleString()}
                </td>

                <td className="px-5 py-4">
                  {item.no_readmission.toFixed(1)}%
                </td>

                <td className="px-5 py-4">
                  {item.readmitted_under_30.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}