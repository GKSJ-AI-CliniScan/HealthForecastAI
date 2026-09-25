'use client';

import { useEffect, useState } from 'react';

type OutcomeProfileType = {
  outcome_status: string;
  patients: number;
  average_time_in_hospital?: number | null;
  average_number_inpatient?: number | null;
  average_number_emergency?: number | null;
  average_number_outpatient?: number | null;
  average_num_medications?: number | null;
  average_num_lab_procedures?: number | null;
  average_num_procedures?: number | null;
  average_number_diagnoses?: number | null;
};

// Prevent runtime errors when JSON has null/undefined values
function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toFixed(2);
}

function formatPatients(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString();
}

export default function OutcomeProfile() {
  const [data, setData] = useState<OutcomeProfileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOutcomeData() {
      try {
        const response = await fetch('/data/outcome_profile.json');

        if (!response.ok) {
          throw new Error('Failed to load patient outcome data');
        }

        const result = (await response.json()) as OutcomeProfileType[];

        setData(result);
      } catch {
        setError('Unable to load patient outcome data.');
      } finally {
        setLoading(false);
      }
    }

    void loadOutcomeData();
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-slate-500">
          Loading patient outcome analysis...
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
      {/* Header */}
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          Patient Outcomes
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Outcome & Recovery Profile
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Observed patient characteristics grouped by readmission outcome.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <p className="text-sm text-slate-500">
            No patient outcome data is available yet.
          </p>
        </div>
      ) : (
        <>
          {/* Outcome summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {data.map((item) => (
              <div
                key={item.outcome_status}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <p className="text-sm text-slate-500">
                  {item.outcome_status}
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {formatPatients(item.patients)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  patients
                </p>
              </div>
            ))}
          </div>

          {/* Outcome analytics table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Outcome
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Patients
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Avg. Hospital Stay
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Avg. Inpatient Visits
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Avg. Emergency Visits
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Avg. Medications
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Avg. Lab Procedures
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Avg. Diagnoses
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr
                    key={item.outcome_status}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-5 py-4 font-medium">
                      {item.outcome_status}
                    </td>

                    <td className="px-5 py-4">
                      {formatPatients(item.patients)}
                    </td>

                    <td className="px-5 py-4">
                      {formatNumber(item.average_time_in_hospital)}
                    </td>

                    <td className="px-5 py-4">
                      {formatNumber(item.average_number_inpatient)}
                    </td>

                    <td className="px-5 py-4">
                      {formatNumber(item.average_number_emergency)}
                    </td>

                    <td className="px-5 py-4">
                      {formatNumber(item.average_num_medications)}
                    </td>

                    <td className="px-5 py-4">
                      {formatNumber(item.average_num_lab_procedures)}
                    </td>

                    <td className="px-5 py-4">
                      {formatNumber(item.average_number_diagnoses)}
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