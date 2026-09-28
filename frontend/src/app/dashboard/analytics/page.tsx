'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import type { HospitalSummary, ReadmissionDistribution, PopulationHealth } from '@/types';

const RISK_COLORS: Record<string, string> = { high: '#dc2626', medium: '#d97706', low: '#16a34a' };

export default function HealthcareAnalyticsPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<HospitalSummary | null>(null);
  const [distribution, setDistribution] = useState<ReadmissionDistribution | null>(null);
  const [population, setPopulation] = useState<PopulationHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<HospitalSummary>('/analytics/summary', {}, token),
      apiFetch<ReadmissionDistribution>('/analytics/readmissions', {}, token),
      apiFetch<PopulationHealth>('/analytics/population-health', {}, token).catch(() => null),
    ])
      .then(([summaryData, distributionData, populationData]) => {
        setSummary(summaryData);
        setDistribution(distributionData);
        setPopulation(populationData);
      })
      .catch(() => setError('Could not load analytics. Your role may not have access to all sections.'))
      .finally(() => setIsLoading(false));
  }, [token]);

  const riskChartData = distribution?.current_distribution.map((d) => ({
    category: d.risk_category.charAt(0).toUpperCase() + d.risk_category.slice(1),
    count: d.count,
    key: d.risk_category,
  })) ?? [];

  const genderChartData = population
    ? Object.entries(population.gender_distribution).map(([gender, count]) => ({ label: gender, count }))
    : [];

  const ageChartData = population
    ? Object.entries(population.age_distribution)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([age, count]) => ({ label: age, count }))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Healthcare Analytics</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Hospital-wide analytics</h1>
      
      <p className="mt-2 max-w-xl text-sm text-slate-500">
        Aggregated patient, risk, and population health statistics across the hospital.
      </p>

      {error && <p className="mt-4 text-sm text-risk-high">{error}</p>}

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total patients" value={isLoading ? '—' : String(summary?.total_patients ?? 0)} />
        <StatCard label="Predictions made" value={isLoading ? '—' : String(summary?.total_predictions_made ?? 0)} />
        <StatCard
          label="Avg readmission risk"
          value={isLoading ? '—' : `${((summary?.average_readmission_risk ?? 0) * 100).toFixed(1)}%`}
        />
      </section>

      <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-sm font-semibold">Current risk distribution</h2>
        <p className="mt-1 text-xs text-slate-500">Each patient&apos;s most recent risk category.</p>
        {riskChartData.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No predictions recorded yet.</p>
        ) : (
          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskChartData.map((entry) => (
                    <Cell key={entry.key} fill={RISK_COLORS[entry.key] ?? '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-semibold">Population by gender</h2>
          <p className="mt-1 text-xs text-slate-500">Gender distribution across all patients.</p>
          {genderChartData.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">Not available for your role.</p>
          ) : (
            <div className="mt-6 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genderChartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} width={70} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#0f172a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-sm font-semibold">Population by age group</h2>
          <p className="mt-1 text-xs text-slate-500">Patients grouped by age range.</p>
          {ageChartData.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">Not available for your role.</p>
          ) : (
            <div className="mt-6 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} angle={-30} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#334155" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-mono)] text-2xl font-semibold">{value}</p>
    </div>
  );
}