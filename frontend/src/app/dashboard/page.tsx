// FILE: src/app/dashboard/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  HeartPulse,
  Users,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { P } from '@/lib/permissions';

import type {
  HospitalSummary,
  Patient,
  ReadmissionDistribution,
  RiskPrediction,
} from '@/types';

import {
  ErrorState,
  KpiCard,
  PageHeader,
  RiskPill,
  SectionCard,
  riskPercent,
} from '@/components/ui';

export default function OverviewPage() {
  const { token, role, permissions } = useAuth();

  const [summary, setSummary] =
    useState<HospitalSummary | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [scores, setScores] = useState<RiskPrediction[]>([]);
  const [dist, setDist] =
    useState<ReadmissionDistribution | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canHospital = permissions.includes(P.analytics);

  const canPatients =
    permissions.includes(P.patientAssigned) ||
    permissions.includes(P.patientAll);

  const canRisk = permissions.includes(P.risk);
  const canAggregated = permissions.includes(P.riskAggregated);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError('');

    const calls: Promise<unknown>[] = [];

    if (canHospital) {
      calls.push(
        apiFetch<HospitalSummary>(
          '/analytics/summary',
          {},
          token,
        ).then(setSummary),
      );
    }

    if (canPatients) {
      calls.push(
        apiFetch<Patient[]>(
          '/patients',
          {},
          token,
        ).then(setPatients),
      );
    }

    if (canRisk) {
      calls.push(
        apiFetch<RiskPrediction[]>(
          '/risk/scores',
          {},
          token,
        ).then(setScores),
      );
    }

    if (canAggregated) {
      calls.push(
        apiFetch<ReadmissionDistribution>(
          '/analytics/readmissions',
          {},
          token,
        ).then(setDist),
      );
    }

    Promise.all(calls)
      .catch((e) =>
        setError(
          e?.message ??
            'Some overview data could not be loaded.',
        ),
      )
      .finally(() => setLoading(false));
  }, [
    token,
    canHospital,
    canPatients,
    canRisk,
    canAggregated,
  ]);

  /* =========================================================
     RISK DISTRIBUTION
     Uses backend distribution when available.
     Falls back to individual scores when permitted.
     ========================================================= */

  const distribution = useMemo(() => {
    if (dist?.current_distribution) {
      return ['low', 'medium', 'high'].map((category) => ({
        category,
        count:
          dist.current_distribution.find(
            (x) => x.risk_category === category,
          )?.count ?? 0,
      }));
    }

    const counts = {
      low: 0,
      medium: 0,
      high: 0,
    };

    scores.forEach((score) => {
      if (score.risk_category in counts) {
        counts[
          score.risk_category as keyof typeof counts
        ]++;
      }
    });

    return Object.entries(counts).map(
      ([category, count]) => ({
        category,
        count,
      }),
    );
  }, [dist, scores]);

  const totalRisk = distribution.reduce(
    (total, item) => total + item.count,
    0,
  );

  const lowCount =
    distribution.find((item) => item.category === 'low')
      ?.count ?? 0;

  const mediumCount =
    distribution.find((item) => item.category === 'medium')
      ?.count ?? 0;

  const highCount =
    distribution.find((item) => item.category === 'high')
      ?.count ?? 0;

  const lowPercent = totalRisk
    ? (lowCount / totalRisk) * 100
    : 0;

  const mediumPercent = totalRisk
    ? (mediumCount / totalRisk) * 100
    : 0;

  const highPercent = totalRisk
    ? (highCount / totalRisk) * 100
    : 0;

 
  const scope =
    role === 'doctor'
      ? 'assigned patients'
      : role === 'researcher'
        ? 'de-identified cohort'
        : role === 'hospital_admin'
          ? 'hospital-wide view'
          : 'full platform';

  /* =========================================================
     QUICK ACCESS
     ========================================================= */

  const quickAccess = [
    {
      href: '/dashboard/risk',
      label: 'Risk & Forecast',
      ok:
        permissions.includes(P.risk) ||
        permissions.includes(P.riskAggregated),
      icon: HeartPulse,
    },
    {
      href: '/dashboard/registry',
      label: 'Patient Registry',
      ok: canPatients,
      icon: Users,
    },
    {
      href: '/dashboard/analytics',
      label: 'Healthcare Analytics',
      ok: canHospital,
      icon: BarChart3,
    },
    {
      href: '/dashboard/research',
      label: 'Research Cohort',
      ok: permissions.includes(P.patientAnon),
      icon: Activity,
    },
  ];

  return (
    <div>
      {/* =======================================================
          PAGE HEADER
          ======================================================= */}

      <PageHeader
        eyebrow="Overview"
        title="Good to see you"
        description={`Your ${scope} is ready. Review the signals most relevant to your role.`}
        actions={
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live data workspace
          </div>
        }
      />

      {/* =======================================================
          ERROR
          ======================================================= */}

      {error && (
        <div className="mb-5">
          <ErrorState message={error} />
        </div>
      )}

      {/* =======================================================
          KPI CARDS
          ======================================================= */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Patients in scope"
          value={
            loading
              ? '—'
              : canHospital
                ? summary?.total_patients ?? 0
                : patients.length
          }
          icon={<Users className="h-5 w-5" />}
        />

        <KpiCard
          label="Predictions made"
          value={
            loading
              ? '—'
              : summary?.total_predictions_made ??
                scores.length
          }
          icon={<HeartPulse className="h-5 w-5" />}
          accent="teal"
        />

        <KpiCard
          label="Average readmission risk"
          value={
            loading
              ? '—'
              : summary
                ? riskPercent(
                    summary.average_readmission_risk,
                  )
                : scores.length
                  ? riskPercent(
                      scores.reduce(
                        (total, score) =>
                          total +
                          score.readmission_probability,
                        0,
                      ) / scores.length,
                    )
                  : '—'
          }
          icon={<Activity className="h-5 w-5" />}
          accent="amber"
        />

        <KpiCard
          label="High-risk patients"
          value={
            loading
              ? '—'
              : canRisk
                ? highCount
                : highCount
          }
          detail={
            totalRisk
              ? `${totalRisk} patients with a latest risk band`
              : 'No latest risk records'
          }
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="red"
        />
      </section>

      {/* =======================================================
          RISK VISUALIZATION + RISK DISTRIBUTION

          LEFT  = visual risk overview
          RIGHT = detailed risk distribution

          Latest high-risk signals removed.
          ======================================================= */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.05fr]">
        {/* =====================================================
            LEFT — RISK OVERVIEW VISUAL
            ===================================================== */}

        {/* =====================================================
    LEFT — RISK INTELLIGENCE INSIGHTS
    ===================================================== */}

      <SectionCard
        title="Risk intelligence"
        description="Key insights from the latest available risk predictions."
      >
        {loading ? (
          <div className="space-y-5 animate-pulse">
            <div className="h-40 rounded-2xl bg-slate-100" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 rounded-xl bg-slate-100" />
              <div className="h-20 rounded-xl bg-slate-100" />
            </div>
          </div>
        ) : scores.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
            <div className="text-center">
              <HeartPulse className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No risk predictions available
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Risk insights will appear after predictions are available.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Main average-risk visualization */}
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Average prediction score
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-navy-950">
                    {riskPercent(
                      scores.reduce(
                        (sum, score) =>
                          sum + score.readmission_probability,
                        0,
                      ) / scores.length,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Across {scores.length} latest predictions
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50">
                  <Activity className="h-7 w-7 text-clinical-600" />
                </div>
              </div>

              {/* Average-risk gauge */}
              <div className="mt-6">
                <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-risk-low via-risk-medium to-risk-high"
                    style={{
                      width: '100%',
                    }}
                  />

                  <div
                    className="absolute top-1/2 h-6 w-1.5 -translate-y-1/2 rounded-full border-2 border-white bg-navy-950 shadow-sm"
                    style={{
                      left: `${Math.min(
                        100,
                        Math.max(
                          0,
                          (scores.reduce(
                            (sum, score) =>
                              sum +
                              score.readmission_probability,
                            0,
                          ) /
                            scores.length) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex justify-between text-[9px] font-medium text-slate-400">
                  <span>Lower</span>
                  <span>Moderate</span>
                  <span>Higher</span>
                </div>
              </div>
            </div>

            {/* Insight cards */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* Highest score */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Highest score
                  </span>

                  <AlertTriangle className="h-4 w-4 text-risk-high" />
                </div>

                <p className="mt-2 text-xl font-bold text-navy-950">
                  {riskPercent(
                    Math.max(
                      ...scores.map(
                        (score) =>
                          score.readmission_probability,
                      ),
                    ),
                  )}
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  Latest highest prediction
                </p>
              </div>

              {/* Above 20% */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Above 20%
                  </span>

                  <BarChart3 className="h-4 w-4 text-clinical-600" />
                </div>

                <p className="mt-2 text-xl font-bold text-navy-950">
                  {
                    scores.filter(
                      (score) =>
                        score.readmission_probability >= 0.2,
                    ).length
                  }
                </p>

                <p className="mt-1 text-[10px] text-slate-400">
                  predictions at or above 20%
                </p>
              </div>
            </div>

            {/* Prediction insight strip */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-100 bg-cyan-50/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                  <HeartPulse className="h-4 w-4 text-clinical-600" />
                </div>

                <div>
                  <p className="text-xs font-bold text-navy-950">
                    Prediction coverage
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Latest risk predictions available in your scope
                  </p>
                </div>
              </div>

              <span className="text-sm font-bold text-clinical-700">
                {scores.length}
              </span>
            </div>
          </>
        )}
</SectionCard>

        {/* =====================================================
            RIGHT — RISK DISTRIBUTION
            ===================================================== */}

        <SectionCard
          title="Risk distribution"
          description="Latest low, medium and high risk counts in your accessible scope."
          actions={
            <Link
              href="/dashboard/risk"
              className="hidden items-center gap-1 text-xs font-bold text-clinical-700 hover:underline sm:flex"
            >
              Open risk view
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="space-y-6">
            {distribution.map((item) => {
              const percentage = totalRisk
                ? (item.count / totalRisk) * 100
                : 0;

              return (
                <div key={item.category}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <RiskPill category={item.category} />

                    <div className="text-right">
                      <span className="text-sm font-bold text-navy-950">
                        {item.count}{' '}
                        {item.count === 1
                          ? 'patient'
                          : 'patients'}
                      </span>

                      <span className="ml-2 text-[11px] font-medium text-slate-400">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.category === 'high'
                          ? 'bg-risk-high'
                          : item.category === 'medium'
                            ? 'bg-risk-medium'
                            : 'bg-risk-low'
                      }`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current risk mix */}
          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">
                Current risk mix
              </span>

              <span className="text-[10px] text-slate-400">
                {totalRisk} total patients
              </span>
            </div>

            <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-slate-100">
              {lowPercent > 0 && (
                <div
                  className="bg-risk-low transition-all duration-500"
                  style={{
                    width: `${lowPercent}%`,
                  }}
                />
              )}

              {mediumPercent > 0 && (
                <div
                  className="bg-risk-medium transition-all duration-500"
                  style={{
                    width: `${mediumPercent}%`,
                  }}
                />
              )}

              {highPercent > 0 && (
                <div
                  className="bg-risk-high transition-all duration-500"
                  style={{
                    width: `${highPercent}%`,
                  }}
                />
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-risk-low" />

                  <span className="text-[10px] font-semibold text-slate-600">
                    Low
                  </span>
                </div>

                <p className="mt-1 text-sm font-bold text-navy-950">
                  {lowPercent.toFixed(0)}%
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-risk-medium" />

                  <span className="text-[10px] font-semibold text-slate-600">
                    Medium
                  </span>
                </div>

                <p className="mt-1 text-sm font-bold text-navy-950">
                  {mediumPercent.toFixed(0)}%
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-risk-high" />

                  <span className="text-[10px] font-semibold text-slate-600">
                    High
                  </span>
                </div>

                <p className="mt-1 text-sm font-bold text-navy-950">
                  {highPercent.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* =======================================================
          QUICK ACCESS
          ======================================================= */}

      <SectionCard
        title="Quick access"
        description="Open the workspace areas available to your role."
        className="mt-6"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickAccess
            .filter((item) => item.ok)
            .map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50/40 hover:shadow-card"
                >
                  <Icon className="h-5 w-5 text-clinical-600" />

                  <p className="mt-3 text-sm font-bold text-navy-950">
                    {item.label}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Open workspace
                    <ArrowRight className="inline h-3 w-3 transition group-hover:translate-x-1" />
                  </p>
                </Link>
              );
            })}
        </div>
      </SectionCard>
    </div>
  );
}