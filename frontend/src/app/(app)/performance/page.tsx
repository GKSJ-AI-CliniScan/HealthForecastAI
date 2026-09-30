'use client';

import { useState } from 'react';
import { TrendChart } from '@/components/charts/TrendChart';
import { ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/lib/auth';
import type { PerformanceReport, TrendReport } from '@/types';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const VERDICT_COLOUR: Record<string, string> = {
  'worse than expected': '#8a1c12',
  'better than expected': '#0f7b39',
};

export default function PerformancePage() {
  const { token, can } = useAuth();
  const [dimension, setDimension] = useState('department');
  const performance = useApi<PerformanceReport>(`/analytics/performance?dimension=${dimension}`);
  const trends = useApi<TrendReport>('/analytics/trends?buckets=10');
  const [exportError, setExportError] = useState<string | null>(null);

  async function download() {
    setExportError(null);
    try {
      const response = await fetch(`${API}/reports/hospital-performance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Export failed (${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hospital-performance.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  const error = performance.error ?? trends.error;
  if (error) return <ErrorBlock message={error} />;
  if (trends.loading || (performance.loading && !performance.data)) return <Loading />;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance and trends</h1>
          <p className="muted mt-1 text-sm">
            Are readmissions where the model expects, and is the process stable?
          </p>
        </div>
        {can('analytics:export') ? (
          <button type="button" className="btn-ghost" onClick={download}>
            Export CSV
          </button>
        ) : null}
      </header>
      {exportError ? <ErrorBlock message={exportError} /> : null}

      {trends.data ? (
        <section className="card">
          <h2 className="text-lg font-semibold">Readmission rate control chart</h2>
          <p className="muted mb-4 mt-1 text-sm">{trends.data.axis_note}</p>
          <TrendChart points={trends.data.points} centre={trends.data.centre_line} />
          {trends.data.signals.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm" style={{ color: '#8a1c12' }}>
              {trends.data.signals.map((s) => (
                <li key={`${s.cohort}-${s.rule}`}>
                  Cohort {s.cohort}: {s.rule} ({s.detail})
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted mt-4 text-sm">No signals: ordinary variation only.</p>
          )}
          <p className="muted mt-2 text-xs">{trends.data.reading}</p>
        </section>
      ) : null}

      {performance.data ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Observed against expected readmissions</h2>
            <select
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--surface)',
              }}
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              aria-label="Group by"
            >
              <option value="department">Department</option>
              <option value="diagnosis_group">Diagnosis group</option>
            </select>
          </div>
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">{performance.data.dimension_title}</th>
                  <th className="th">Admissions</th>
                  <th className="th">Observed</th>
                  <th className="th">Expected</th>
                  <th className="th">Ratio (95% CI)</th>
                  <th className="th">Reading</th>
                </tr>
              </thead>
              <tbody>
                {performance.data.rows.map((r) => (
                  <tr key={r.group}>
                    <td className="td font-medium">{r.group}</td>
                    <td className="td">{r.admissions.toLocaleString()}</td>
                    {r.observed_vs_expected ? (
                      <>
                        <td className="td">{r.observed_vs_expected.observed.toLocaleString()}</td>
                        <td className="td">{r.observed_vs_expected.expected.toLocaleString()}</td>
                        <td className="td">
                          {r.observed_vs_expected.ratio.toFixed(2)}{' '}
                          <span className="muted text-xs">
                            ({r.observed_vs_expected.ci_low.toFixed(2)}–
                            {r.observed_vs_expected.ci_high.toFixed(2)})
                          </span>
                        </td>
                        <td
                          className="td"
                          style={{
                            color: VERDICT_COLOUR[r.observed_vs_expected.verdict],
                          }}
                        >
                          {r.observed_vs_expected.verdict}
                        </td>
                      </>
                    ) : (
                      <td className="td muted" colSpan={4}>
                        Suppressed: too few patients to report safely
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted text-xs">{performance.data.caveat}</p>
        </section>
      ) : null}
    </div>
  );
}
