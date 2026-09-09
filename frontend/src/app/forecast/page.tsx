'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { forecastService } from '@/services/forecastService';
import {
  ReadmissionForecastSummary,
  ForecastHorizon,
  ForecastScope,
} from '@/types/forecast';
import { ReadmissionTrendChart } from '@/components/charts/ReadmissionTrendChart';
import { DepartmentForecastChart } from '@/components/charts/DepartmentForecastChart';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  TrendingDownIcon,
  HeartPulseIcon,
  UsersIcon,
  ActivityIcon,
  ArrowLeftIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  InfoIcon,
  StethoscopeIcon,
  ClockIcon,
} from '@/components/ui/Icons';

export default function ForecastingDashboardPage() {
  const router = useRouter();
  const { user, isInitialized, token } = useAuth();

  // Protected route guard
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>('90d');
  const [selectedScope, setSelectedScope] = useState<ForecastScope>('hospital');
  const [forecast, setForecast] = useState<ReadmissionForecastSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForecastData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await forecastService.getForecastSummary(
        selectedHorizon,
        selectedScope,
        token ?? undefined,
      );
      setForecast(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate readmission forecast.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedHorizon, selectedScope, token]);

  useEffect(() => {
    void loadForecastData();
  }, [loadForecastData]);

  const horizons: { id: ForecastHorizon; label: string; sub: string }[] = [
    { id: '30d', label: '30 Days', sub: 'Immediate Horizon' },
    { id: '60d', label: '60 Days', sub: 'Short-Term' },
    { id: '90d', label: '90 Days', sub: 'Quarterly Standard' },
    { id: '180d', label: '6 Months', sub: 'Semi-Annual' },
    { id: '365d', label: '1 Year', sub: 'Annual Projection' },
  ];

  const scopes: { id: ForecastScope; label: string }[] = [
    { id: 'hospital', label: 'Hospital-Wide' },
    { id: 'cardiology', label: 'Cardiology' },
    { id: 'endocrinology', label: 'Endocrinology' },
    { id: 'internal_medicine', label: 'Internal Medicine' },
    { id: 'nephrology', label: 'Nephrology' },
  ];

  if (!isInitialized || !user) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState
            title="Authenticating Forecasting Session..."
            description="Verifying permissions for readmission intelligence & analytics."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-xs font-semibold text-warm-text-muted hover:text-brand-600 dark:text-warm-text-muted dark:hover:text-brand-400"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-warm-text dark:text-warm-text">
                Hospital Readmission Forecasting & Analytics Dashboard
              </h1>
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                Module 6
              </span>
            </div>
            <p className="mt-0.5 text-xs text-warm-text-muted dark:text-warm-text-muted">
              Predictive population trajectories, departmental risk distributions, and clinical capacity insights.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/risk">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ShieldAlertIcon className="h-3.5 w-3.5" />}
                className="text-xs border-warm-border text-warm-text hover:bg-warm-bg"
              >
                Patient Risk Scoring
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadForecastData()}
              isLoading={isLoading}
              leftIcon={<RefreshCwIcon className="h-3.5 w-3.5" />}
              className="text-xs border-warm-border text-warm-text hover:bg-warm-bg"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Prominent Demo / Simulated Data Disclaimer Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white mt-0.5">
              <InfoIcon className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Milestone 2 Demonstrative Readmission Forecast
                </span>
                <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/80 dark:text-amber-200">
                  Simulated Time-Series Engine
                </span>
              </div>
              <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                The forecasting trajectories, confidence intervals, and departmental metrics displayed in this dashboard are simulated demonstrative artifacts based on the Diabetes 130-US Hospitals dataset. They illustrate executive and clinical planning workflows and are structured for future live FastAPI ML model integration.
              </p>
            </div>
          </div>
        </div>

        {/* Controls Toolbar: Horizon Selection & Scope Switcher */}
        <div className="rounded-xl border border-warm-border bg-white p-4 shadow-sm dark:border-warm-border dark:bg-warm-card space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Forecast Horizon Tabs */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-warm-text-muted dark:text-warm-text-muted uppercase tracking-wider block">
                Forecast Time Horizon:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {horizons.map((h) => {
                  const isSelected = selectedHorizon === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHorizon(h.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-brand-500 text-white shadow-xs'
                          : 'bg-warm-neutral/50 text-warm-text-muted hover:bg-warm-neutral hover:text-warm-text dark:bg-warm-neutral/20 dark:text-warm-text-muted'
                      }`}
                    >
                      <span>{h.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Department Scope Filter */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-warm-text-muted dark:text-warm-text-muted uppercase tracking-wider block">
                Department Scope:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {scopes.map((s) => {
                  const isSelected = selectedScope === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedScope(s.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-brand-700 text-white font-semibold shadow-xs'
                          : 'bg-warm-neutral/30 text-warm-text-muted hover:bg-warm-neutral hover:text-warm-text dark:bg-warm-neutral/10 dark:text-warm-text-muted'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <LoadingState
            title="Aggregating Historical Trajectories & Forecasting Readmissions..."
            description="Executing longitudinal trend regression and confidence bounds modeling."
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorMessage
            title="Forecasting Computation Error"
            message={error}
            onRetry={loadForecastData}
          />
        )}

        {/* Main Dashboard Content */}
        {forecast && !isLoading && (
          <div className="space-y-6">
            {/* KPI Headline Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Projected Readmission Rate */}
              <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-warm-text-muted dark:text-warm-text-muted">
                    Projected Readmission Rate
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-600 bg-brand-50 dark:bg-brand-950/60">
                    <HeartPulseIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-warm-text dark:text-warm-text">
                    {forecast.projectedRate}%
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-0.5 text-sage-700 dark:text-sage-400 font-semibold">
                      <TrendingDownIcon className="h-3.5 w-3.5" />
                      {Math.abs(forecast.projectedRateChange)}% Improvement
                    </span>
                    <span className="text-[11px] text-warm-text-muted">
                      vs {forecast.baselineRate}% baseline
                    </span>
                  </div>
                </div>
              </Card>

              {/* Card 2: Predicted Readmissions Volume */}
              <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-warm-text-muted dark:text-warm-text-muted">
                    Predicted Readmissions
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-coral-600 bg-coral-50 dark:bg-coral-900/50">
                    <ShieldAlertIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-warm-text dark:text-warm-text">
                    {forecast.predictedReadmissions} Patients
                  </div>
                  <p className="mt-1 text-[11px] text-warm-text-muted">
                    Over next {forecast.horizonDays} days ({forecast.scopeLabel.split('(')[0].trim()})
                  </p>
                </div>
              </Card>

              {/* Card 3: Estimated Preventable Readmissions */}
              <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-warm-text-muted dark:text-warm-text-muted">
                    Preventable Encounters
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sage-700 bg-sage-50 dark:bg-sage-900/50">
                    <UsersIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-sage-700 dark:text-sage-400">
                    ~{forecast.preventableReadmissionsEstimate} Preventable
                  </div>
                  <p className="mt-1 text-[11px] text-warm-text-muted">
                    With targeted transitional care protocols
                  </p>
                </div>
              </Card>

              {/* Card 4: 95% Confidence Interval */}
              <Card className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-warm-text-muted dark:text-warm-text-muted">
                    Confidence Range (95% CI)
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-700 bg-amber-50 dark:bg-amber-900/50">
                    <ActivityIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold tracking-tight text-warm-text dark:text-warm-text">
                    {forecast.confidenceInterval.lower}% &ndash; {forecast.confidenceInterval.upper}%
                  </div>
                  <p className="mt-1 text-[11px] text-warm-text-muted">
                    Model error variance: &plusmn;0.65%
                  </p>
                </div>
              </Card>
            </div>

            {/* Primary Visualization: Recharts Composed Trend Chart */}
            <ReadmissionTrendChart
              data={forecast.trendSeries}
              nationalBenchmark={forecast.nationalBenchmarkRate}
            />

            {/* Department Comparison & Risk Breakdown Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Department Bar Chart */}
              <div className="lg:col-span-6">
                <DepartmentForecastChart departments={forecast.departmentBreakdown} />
              </div>

              {/* Department Table Matrix */}
              <div className="lg:col-span-6">
                <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-warm-border/60 pb-3 dark:border-warm-border/60">
                      <div>
                        <h3 className="text-sm font-bold text-warm-text dark:text-warm-text">
                          Department Risk Distribution
                        </h3>
                        <p className="text-[11px] text-warm-text-muted">
                          Stratification of clinical service lines by forecasted readmission rate.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-warm-border/60 text-[11px] text-warm-text-muted">
                            <th className="pb-2 font-semibold">Department</th>
                            <th className="pb-2 font-semibold text-center">Risk Tier</th>
                            <th className="pb-2 font-semibold text-right">Current</th>
                            <th className="pb-2 font-semibold text-right">Projected</th>
                            <th className="pb-2 font-semibold text-right">Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-warm-border/40">
                          {forecast.departmentBreakdown.map((dept) => (
                            <tr key={dept.departmentId} className="hover:bg-warm-neutral/20 transition-colors">
                              <td className="py-2.5 font-medium text-warm-text dark:text-warm-text">
                                {dept.departmentName}
                              </td>
                              <td className="py-2.5 text-center">
                                {dept.riskTier === 'high' ? (
                                  <Badge variant="riskHigh">High</Badge>
                                ) : dept.riskTier === 'medium' ? (
                                  <Badge variant="riskMedium">Medium</Badge>
                                ) : (
                                  <Badge variant="riskLow">Low</Badge>
                                )}
                              </td>
                              <td className="py-2.5 text-right font-mono font-semibold text-warm-text">
                                {dept.currentRate}%
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold text-brand-600 dark:text-brand-400">
                                {dept.projectedRate}%
                              </td>
                              <td className="py-2.5 text-right font-mono text-sage-700 dark:text-sage-400 font-semibold">
                                {dept.rateChange}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-warm-border/40 text-[11px] text-warm-text-muted flex items-center justify-between">
                    <span>Target CMS Threshold: <strong>&lt; 9.5%</strong></span>
                    <span>Hospital Average: <strong>{forecast.projectedRate}%</strong></span>
                  </div>
                </Card>
              </div>
            </div>

            {/* Clinical Forecast Insights Section (Jargon-Free Clinical Explanations) */}
            <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm">
              <div className="flex items-center justify-between border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
                <div>
                  <div className="flex items-center gap-2">
                    <StethoscopeIcon className="h-4 w-4 text-brand-500" />
                    <h3 className="text-base font-bold tracking-tight text-warm-text dark:text-warm-text">
                      Clinical Forecast Insights & Actionable Implications
                    </h3>
                  </div>
                  <p className="text-xs text-warm-text-muted dark:text-warm-text-muted mt-0.5">
                    Plain-language clinical translations derived from the machine learning forecasting models.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {forecast.clinicalInsights.map((insight) => {
                  const impactBadge =
                    insight.impactLevel === 'high'
                      ? 'bg-coral-100 text-coral-800 dark:bg-coral-950/80 dark:text-coral-200 border-coral-200'
                      : insight.impactLevel === 'medium'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border-amber-200'
                      : 'bg-sage-100 text-sage-800 dark:bg-sage-950/80 dark:text-sage-200 border-sage-200';

                  return (
                    <div
                      key={insight.id}
                      className="rounded-xl border border-warm-border/70 bg-warm-neutral/20 dark:bg-warm-neutral/10 p-4.5 space-y-2.5 transition-all hover:border-warm-border hover:shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${impactBadge}`}
                        >
                          {insight.impactLevel} Impact
                        </span>
                        <span className="text-[10px] uppercase font-bold text-warm-text-light">
                          {insight.category.replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-warm-text dark:text-warm-text">
                        {insight.title}
                      </h4>

                      <p className="text-xs text-warm-text-muted dark:text-warm-text-muted leading-relaxed">
                        {insight.summary}
                      </p>

                      <div className="rounded-lg bg-white dark:bg-warm-card p-3 border border-warm-border/60 text-xs space-y-1.5">
                        <div>
                          <strong className="text-warm-text dark:text-warm-text">Clinical Implication: </strong>
                          <span className="text-warm-text-muted">{insight.clinicalImplication}</span>
                        </div>
                        <div className="pt-1.5 border-t border-warm-border/40 text-brand-700 dark:text-brand-300">
                          <strong>Recommended Action: </strong>
                          <span>{insight.actionableRecommendation}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Model Governance & Methodology Footer */}
            <div className="border-t border-warm-border/60 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-warm-text-muted dark:text-warm-text-muted">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-3.5 w-3.5 text-brand-500" />
                <span>
                  Forecasting Engine: <strong className="font-mono text-warm-text dark:text-warm-text">{forecast.modelDetails.name}</strong> ({forecast.modelDetails.version})
                </span>
              </div>
              <div>
                <span>
                  Mean Absolute Error: <strong>&plusmn;{forecast.modelDetails.meanAbsoluteError}%</strong> &bull; Updated Daily
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
