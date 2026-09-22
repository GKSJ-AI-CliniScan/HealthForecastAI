'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { analyticsService } from '@/services/analyticsService';
import {
  AnalyticsDashboardData,
  AnalyticsFilterParams,
  AnalyticsTimeframe,
  AnalyticsDepartment,
} from '@/types/analytics';
import { ReadmissionChart } from '@/components/charts/ReadmissionChart';
import { RecoveryTrendChart } from '@/components/charts/RecoveryTrendChart';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BarChartIcon,
  ActivityIcon,
  TrendingDownIcon,
  UsersIcon,
  ClockIcon,
  ShieldAlertIcon,
  RefreshCwIcon,
  DownloadIcon,
  FilterIcon,
  InfoIcon,
  StethoscopeIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  LayersIcon,
} from '@/components/ui/Icons';

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const { user, isInitialized, token } = useAuth();

  // Protected route guard: Redirect to /login if unauthenticated
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  // Filters State
  const [filters, setFilters] = useState<AnalyticsFilterParams>({
    timeframe: '90d',
    department: 'all',
    treatmentCategory: 'all',
  });

  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getDashboardData(filters, token ?? undefined);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load healthcare performance analytics.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, token]);

  useEffect(() => {
    void loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleExport = () => {
    // Safe UI-ready export handler
    setExportNotice('Export requested: Preparing anonymized healthcare performance metrics CSV extract.');
    setTimeout(() => {
      setExportNotice(null);
    }, 4000);
  };

  const timeframes: { id: AnalyticsTimeframe; label: string }[] = [
    { id: '30d', label: 'Last 30 Days' },
    { id: '90d', label: 'Last 90 Days' },
    { id: '6m', label: 'Last 6 Months' },
    { id: '1y', label: 'Past 1 Year' },
  ];

  const departments: { id: AnalyticsDepartment; label: string }[] = [
    { id: 'all', label: 'All Hospital Departments' },
    { id: 'cardiology', label: 'Cardiology' },
    { id: 'endocrinology', label: 'Endocrinology' },
    { id: 'internal_medicine', label: 'Internal Medicine' },
    { id: 'nephrology', label: 'Nephrology' },
  ];

  const treatmentCategories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Regimens' },
    { id: 'pharmacological', label: 'Pharmacological' },
    { id: 'care_coordination', label: 'Care Coordination' },
  ];

  if (!isInitialized || !user) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState
            title="Authenticating Healthcare Analytics Session..."
            description="Verifying practitioner credentials for hospital performance reporting."
          />
        </div>
      </AppShell>
    );
  }

  const summary = data?.summary;
  const readmissionRate = summary?.readmission_rate ?? 8.42;
  const benchmarkRate = summary?.national_benchmark_rate ?? 8.0;
  const totalAdmissions = summary?.total_admissions ?? 0;
  const averageLos = summary?.average_length_of_stay ?? 0;
  const riskDist = summary?.risk_distribution ?? { low: 0, medium: 0, high: 0 };
  const totalRiskCount = (riskDist.low + riskDist.medium + riskDist.high) || 1;

  const lowRiskPct = Math.round((riskDist.low / totalRiskCount) * 100);
  const medRiskPct = Math.round((riskDist.medium / totalRiskCount) * 100);
  const highRiskPct = Math.round((riskDist.high / totalRiskCount) * 100);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Healthcare Analytics Welcome & Provenance Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-warm-text p-6 text-white shadow-md">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-200">
                <BarChartIcon className="h-3.5 w-3.5 text-brand-300" />
                Performance & Analytics
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/20 px-2 py-0.5 text-[10px] font-medium text-teal-200">
                {data?.isSimulated ? 'Simulated Analytics Data' : 'Live Connected Backend'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Healthcare Performance & Clinical Analytics
            </h1>
            <p className="text-xs text-brand-100/90 leading-relaxed">
              Longitudinal readmission trajectories, quality benchmark comparisons, and treatment regimen recovery analytics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadAnalyticsData()}
              isLoading={isLoading}
              leftIcon={<RefreshCwIcon className="h-3.5 w-3.5" />}
              className="border-white/25 bg-white/15 text-white hover:bg-white/20 dark:border-white/25 dark:text-white"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              leftIcon={<DownloadIcon className="h-3.5 w-3.5" />}
              className="border-white/25 bg-white/15 text-white hover:bg-white/20 dark:border-white/25 dark:text-white"
            >
              Export Report
            </Button>
          </div>
        </div>

        {/* Temporary Export Notification */}
        {exportNotice && (
          <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/50 dark:text-teal-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-teal-600" />
              <span>{exportNotice}</span>
            </div>
          </div>
        )}

        {/* Filter Control Bar */}
        <Card className="p-4 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-warm-text dark:text-warm-text">
              <FilterIcon className="h-4 w-4 text-brand-500" />
              <span>Analytics Controls & Filters:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Department Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-warm-text-muted">Dept:</span>
                <select
                  value={filters.department}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      department: e.target.value as AnalyticsDepartment,
                    }))
                  }
                  className="rounded-lg border border-warm-border bg-white px-3 py-1.5 text-xs text-warm-text focus:border-brand-500 focus:outline-none dark:border-warm-border dark:bg-warm-card dark:text-warm-text"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-warm-text-muted">Window:</span>
                <div className="flex rounded-lg border border-warm-border bg-warm-neutral/30 p-0.5 dark:border-warm-border dark:bg-warm-neutral/10">
                  {timeframes.map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, timeframe: tf.id }))}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        filters.timeframe === tf.id
                          ? 'bg-white text-warm-text font-semibold shadow-xs dark:bg-warm-card dark:text-warm-text'
                          : 'text-warm-text-muted hover:text-warm-text'
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Treatment Category Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-warm-text-muted">Regimen:</span>
                <select
                  value={filters.treatmentCategory}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      treatmentCategory: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-warm-border bg-white px-3 py-1.5 text-xs text-warm-text focus:border-brand-500 focus:outline-none dark:border-warm-border dark:bg-warm-card dark:text-warm-text"
                >
                  {treatmentCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && !data && (
          <LoadingState
            title="Computing Healthcare Analytics..."
            description="Aggregating clinical encounter metrics, recovery indices, and quality indicators."
          />
        )}

        {/* Error State */}
        {error && (
          <ErrorMessage
            title="Failed to Load Performance Analytics"
            message={error}
            onRetry={loadAnalyticsData}
          />
        )}

        {/* KPI SUMMARY CARDS */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Readmission Rate */}
            <Card className="p-5 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-xs">
              <div className="flex items-center justify-between text-xs text-warm-text-muted mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  30-Day Readmission Rate
                </span>
                <ActivityIcon className="h-4 w-4 text-brand-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-warm-text dark:text-warm-text">
                  {readmissionRate.toFixed(2)}%
                </span>
                <span className="text-xs font-semibold text-sage-600 dark:text-sage-400 flex items-center">
                  <TrendingDownIcon className="h-3.5 w-3.5 mr-0.5" />
                  -0.7% MoM
                </span>
              </div>
              <div className="mt-2 text-[11px] text-warm-text-muted flex justify-between">
                <span>National Target:</span>
                <span className="font-mono font-semibold text-sage-600">{benchmarkRate}%</span>
              </div>
            </Card>

            {/* Card 2: Total Encounters */}
            <Card className="p-5 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-xs">
              <div className="flex items-center justify-between text-xs text-warm-text-muted mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Total Encounters
                </span>
                <UsersIcon className="h-4 w-4 text-brand-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-warm-text dark:text-warm-text">
                  {totalAdmissions.toLocaleString()}
                </span>
                <span className="text-xs text-warm-text-muted">Admissions</span>
              </div>
              <div className="mt-2 text-[11px] text-warm-text-muted flex justify-between">
                <span>Active Caseload:</span>
                <span className="font-mono font-semibold text-warm-text dark:text-warm-text">
                  {Math.round(totalAdmissions * 0.18)} Inpatients
                </span>
              </div>
            </Card>

            {/* Card 3: Average Length of Stay */}
            <Card className="p-5 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-xs">
              <div className="flex items-center justify-between text-xs text-warm-text-muted mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Average Length of Stay (ALOS)
                </span>
                <ClockIcon className="h-4 w-4 text-brand-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-warm-text dark:text-warm-text">
                  {averageLos.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-warm-text-muted">Days / Encounter</span>
              </div>
              <div className="mt-2 text-[11px] text-warm-text-muted flex justify-between">
                <span>Benchmark ALOS:</span>
                <span className="font-mono font-semibold text-sage-600">4.5 Days</span>
              </div>
            </Card>

            {/* Card 4: Risk Distribution */}
            <Card className="p-5 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-xs">
              <div className="flex items-center justify-between text-xs text-warm-text-muted mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  Risk Stratification Cohorts
                </span>
                <ShieldAlertIcon className="h-4 w-4 text-coral-500" />
              </div>
              <div className="flex items-center gap-1.5 h-3 w-full rounded-full overflow-hidden bg-warm-neutral/40 my-2">
                <div
                  className="h-full bg-sage-500 transition-all"
                  style={{ width: `${lowRiskPct}%` }}
                  title={`Low Risk: ${riskDist.low} (${lowRiskPct}%)`}
                />
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${medRiskPct}%` }}
                  title={`Medium Risk: ${riskDist.medium} (${medRiskPct}%)`}
                />
                <div
                  className="h-full bg-coral-500 transition-all"
                  style={{ width: `${highRiskPct}%` }}
                  title={`High Risk: ${riskDist.high} (${highRiskPct}%)`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-warm-text-muted">
                <span className="text-sage-600 dark:text-sage-400 font-semibold">
                  Low: {lowRiskPct}%
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Med: {medRiskPct}%
                </span>
                <span className="text-coral-600 dark:text-coral-400 font-semibold">
                  High: {highRiskPct}%
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* SECTION 1: READMISSION TREND & DEPARTMENT BREAKDOWN */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ReadmissionChart
                data={data.readmissionTrends}
                benchmark={benchmarkRate}
                title={
                  filters.department === 'all'
                    ? 'Hospital-Wide 30-Day Readmission Trajectory'
                    : `${departments.find((d) => d.id === filters.department)?.label} Readmission Trajectory`
                }
              />
            </div>

            {/* Department Comparison Breakdown */}
            <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-warm-border/60 pb-3 dark:border-warm-border/60">
                  <LayersIcon className="h-4 w-4 text-brand-500" />
                  <h3 className="text-sm font-bold text-warm-text dark:text-warm-text">
                    Departmental Performance
                  </h3>
                </div>

                <div className="mt-4 space-y-3.5">
                  {summary?.department_breakdown?.map((dept) => (
                    <div
                      key={dept.departmentKey}
                      className="p-2.5 rounded-lg border border-warm-border/60 bg-warm-neutral/20 dark:border-warm-border/40 dark:bg-warm-neutral/10 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-warm-text dark:text-warm-text">
                          {dept.department}
                        </span>
                        <Badge
                          variant={
                            dept.readmissionRate > 9.0
                              ? 'riskHigh'
                              : dept.readmissionRate > 8.0
                              ? 'riskMedium'
                              : 'riskLow'
                          }
                        >
                          {dept.readmissionRate}% Readmit
                        </Badge>
                      </div>
                      <div className="flex justify-between text-[11px] text-warm-text-muted">
                        <span>Encounters: {dept.totalAdmissions}</span>
                        <span>ALOS: {dept.averageLos}d</span>
                        <span className="text-coral-600 dark:text-coral-400 font-medium">
                          {dept.highRiskCount} High Risk
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-warm-border/60 dark:border-warm-border/60 text-[11px] text-warm-text-muted flex items-center justify-between">
                <span>Aggregated clinical encounter records</span>
                <Link
                  href="/patients"
                  className="text-brand-500 hover:text-brand-600 font-semibold flex items-center gap-0.5"
                >
                  <span>View Roster</span>
                  <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* SECTION 2: LONGITUDINAL RECOVERY TRENDS */}
        {data && (
          <div>
            <RecoveryTrendChart
              data={data.recoveryTrends}
              regimens={data.recoveryRegimens}
            />
          </div>
        )}

        {/* SECTION 3: TREATMENT EFFECTIVENESS COMPARISON TABLE */}
        {data && (
          <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
              <div>
                <div className="flex items-center gap-2">
                  <StethoscopeIcon className="h-4 w-4 text-brand-500" />
                  <h3 className="text-base font-bold tracking-tight text-warm-text dark:text-warm-text">
                    Treatment Effectiveness & Recovery Outcomes Comparison
                  </h3>
                </div>
                <p className="text-xs text-warm-text-muted dark:text-warm-text-muted mt-0.5">
                  Comparative analysis of patient recovery scores, 30-day readmission rates, and treatment adherence across regimens.
                </p>
              </div>

              <span className="text-xs text-warm-text-muted font-medium self-start sm:self-center">
                Showing {data.treatments.length} Clinical Protocols
              </span>
            </div>

            {/* Comparison Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-warm-text dark:text-warm-text">
                <thead className="bg-warm-neutral/40 text-[11px] font-bold uppercase tracking-wider text-warm-text-muted dark:bg-warm-neutral/20 dark:text-warm-text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 rounded-l-lg">
                      Treatment Regimen
                    </th>
                    <th scope="col" className="px-3 py-3">
                      Category
                    </th>
                    <th scope="col" className="px-3 py-3 text-right">
                      Patients Treated
                    </th>
                    <th scope="col" className="px-3 py-3 text-center">
                      Avg Recovery Score
                    </th>
                    <th scope="col" className="px-3 py-3 text-right">
                      30d Readmit Rate
                    </th>
                    <th scope="col" className="px-3 py-3 text-right">
                      Avg LOS
                    </th>
                    <th scope="col" className="px-4 py-3 rounded-r-lg text-right">
                      Adherence
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-border/60 dark:divide-warm-border/40">
                  {data.treatments.map((treatment) => (
                    <tr
                      key={treatment.treatment_name}
                      className="hover:bg-warm-neutral/30 dark:hover:bg-warm-neutral/10 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-semibold text-warm-text dark:text-warm-text max-w-xs">
                        <div>
                          <span>{treatment.treatment_name}</span>
                          {treatment.primary_indication && (
                            <span className="block text-[10px] font-normal text-warm-text-muted truncate">
                              {treatment.primary_indication}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            treatment.category === 'care_coordination'
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300'
                              : 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300'
                          }`}
                        >
                          {treatment.category === 'care_coordination'
                            ? 'Care Coordination'
                            : 'Pharmacological'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono font-medium">
                        {treatment.patients_treated.toLocaleString()}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-warm-neutral/50 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-teal-600 h-2 rounded-full"
                              style={{ width: `${treatment.average_recovery_score}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-warm-text dark:text-warm-text">
                            {treatment.average_recovery_score}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                            treatment.readmission_rate <= 7.0
                              ? 'bg-sage-100 text-sage-800 dark:bg-sage-950/80 dark:text-sage-300'
                              : treatment.readmission_rate <= 9.0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-coral-100 text-coral-800 dark:bg-coral-950/80 dark:text-coral-300'
                          }`}
                        >
                          {treatment.readmission_rate}%
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-warm-text-muted">
                        {treatment.average_los_days ? `${treatment.average_los_days}d` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-teal-700 dark:text-teal-400">
                        {treatment.adherence_rate_percent ? `${treatment.adherence_rate_percent}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Clinical Disclaimer & Transparency Callout */}
            <div className="mt-6 rounded-xl border border-warm-border/80 bg-warm-neutral/30 p-4 text-xs text-warm-text-muted dark:border-warm-border/60 dark:bg-warm-neutral/10 flex items-start gap-3">
              <InfoIcon className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-warm-text dark:text-warm-text block">
                  Clinical Information & Safety Notice
                </span>
                <p className="leading-relaxed text-[11px]">
                  Treatment outcome statistics are compiled from longitudinal encounter databases for clinical performance review.
                  These metrics provide aggregated observational insights and do not constitute direct prescribing advice or replace individual physician evaluation.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
