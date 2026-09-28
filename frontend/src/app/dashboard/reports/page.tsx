'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  endpoint: string;
  filename: string;
  icon: string;
}

const REPORTS: ReportCard[] = [
  {
    id: 'treatment',
    title: 'Treatment Effectiveness Report',
    description: 'Treatment outcomes, recovery performance, and effectiveness analysis.',
    endpoint: '/treatment/export/effectiveness.csv',
    filename: 'treatment_effectiveness_report.csv',
    icon: '💊',
  },
  {
    id: 'readmission',
    title: 'Readmission Risk Report',
    description: 'Current risk distribution and readmission forecasting summary.',
    endpoint: '/analytics/export/readmissions.csv',
    filename: 'readmission_report.csv',
    icon: '📈',
  },
];

export default function ReportsPage() {
  const { token, permissions } = useAuth();
  const canExport = permissions.includes('analytics:export');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(report: ReportCard) {
    if (!token) return;
    setDownloading(report.id);
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${base}${report.endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(`Could not generate ${report.title}.`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Analytics</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Reports</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500">
        View and download healthcare analytics, treatment outcomes, and readmission reports.
      </p>

      {error && <p className="mt-4 text-sm text-risk-high">{error}</p>}
      {!canExport && (
        <p className="mt-4 text-sm text-slate-500">Your role does not have permission to export reports.</p>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <div key={report.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{report.icon}</span>
                <div>
                  <h2 className="text-sm font-semibold">{report.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{report.description}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-risk-low/10 px-2.5 py-1 text-[10px] font-medium text-risk-low">Ready</span>
            </div>
            <button
              onClick={() => handleDownload(report)}
              disabled={!canExport || downloading === report.id}
              className="mt-5 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {downloading === report.id ? 'Generating…' : '↓ Download CSV'}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}