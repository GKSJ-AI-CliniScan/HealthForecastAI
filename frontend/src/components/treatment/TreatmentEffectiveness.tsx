'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type TreatmentEffectiveness = {
  treatment_name: string;
  patients_treated: number;
  no_readmission_rate: number;
  readmission_after_30_rate: number;
  readmission_under_30_rate: number;
  baseline_gap: number;
};

export default function TreatmentEffectiveness() {
  const [data, setData] = useState<TreatmentEffectiveness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTreatmentData() {
      try {
        const response = await fetch(
          '/data/treatment_effectiveness.json',
        );

        if (!response.ok) {
          throw new Error('Failed to load treatment effectiveness data');
        }

        const result =
          (await response.json()) as TreatmentEffectiveness[];

        setData(result);
      } catch {
        setError('Unable to load treatment effectiveness data.');
      } finally {
        setLoading(false);
      }
    }

    void loadTreatmentData();
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-slate-500">
          Loading treatment effectiveness...
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
          Module 4
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Treatment Effectiveness
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Observed treatment outcomes and readmission profiles.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <p className="text-sm text-slate-500">
            No treatment outcome data is available yet.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm text-slate-500">
                Treatments tracked
              </p>

              <p className="mt-2 text-3xl font-bold">
                {data.length}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm text-slate-500">
                Patients treated
              </p>

              <p className="mt-2 text-3xl font-bold">
                {data
                  .reduce(
                    (total, item) =>
                      total + item.patients_treated,
                    0,
                  )
                  .toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm text-slate-500">
                Avg. readmission &lt;30 days
              </p>

              <p className="mt-2 text-3xl font-bold">
                {(
                  (data.reduce(
                    (total, item) =>
                      total + item.readmission_under_30_rate,
                    0,
                  ) /
                    data.length) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-lg font-semibold">
              Treatment Readmission Rates
            </h3>

            <div className="mt-6 h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 10,
                    bottom: 70,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="treatment_name"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />

                  <YAxis
                    tickFormatter={(value) =>
                      `${value * 100}%`
                    }
                  />

                  <Tooltip
                    formatter={(value) =>
                      `${(Number(value) * 100).toFixed(1)}%`
                    }
                  />

                  <Bar
                    dataKey="readmission_under_30_rate"
                    name="Readmitted <30 Days"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Treatment
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
                {data.map((item) => (
                  <tr
                    key={item.treatment_name}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-5 py-4 font-medium">
                      {item.treatment_name}
                    </td>

                    <td className="px-5 py-4">
                      {item.patients_treated.toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      {(
                        item.no_readmission_rate * 100
                      ).toFixed(1)}
                      %
                    </td>

                    <td className="px-5 py-4">
                      {(
                        item.readmission_after_30_rate * 100
                      ).toFixed(1)}
                      %
                    </td>

                    <td className="px-5 py-4">
                      {(
                        item.readmission_under_30_rate * 100
                      ).toFixed(1)}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
