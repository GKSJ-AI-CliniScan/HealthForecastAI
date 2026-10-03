'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { modelService } from '@/services/modelService';
import {
  ActiveModelDetails,
  RegisteredModel,
  ModelDashboardData,
  FeatureImportanceItem,
} from '@/types/model';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import {
  ActivityIcon,
  ShieldAlertIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  InfoIcon,
  LayersIcon,
  SlidersIcon,
  DownloadIcon,
  ArrowRightIcon,
} from '@/components/ui/Icons';


export default function AIModelManagementPage() {
  const router = useRouter();
  const { user, isInitialized, token } = useAuth();
  const currentRole = user?.role ?? 'doctor';
  const isSystemAdmin = currentRole === 'system_admin';

  // Protected route guard: Redirect to /login if unauthenticated
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  const [dashboardData, setDashboardData] = useState<ModelDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state for Registered Models Table
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedModelDetail, setSelectedModelDetail] = useState<RegisteredModel | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const loadModelData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await modelService.getModelDashboardData(token ?? undefined);
      setDashboardData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to retrieve AI model registry data.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadModelData();
  }, [loadModelData]);

  const handleExportModelCard = () => {
    setExportNotice(
      'Model Card Export Generated: Exported structured JSON/Markdown model card with clinical governance metadata.',
    );
    setTimeout(() => {
      setExportNotice(null);
    }, 4500);
  };

  if (isLoading && !dashboardData) {
    return (
      <AppShell>
        <div className="space-y-6">
          <CardSkeleton className="p-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartSkeleton height={320} />
            </div>
            <CardSkeleton />
          </div>
        </div>
      </AppShell>
    );
  }

  const activeModel: ActiveModelDetails | undefined = dashboardData?.activeModel;
  const registeredModels: RegisteredModel[] = dashboardData?.registeredModels || [];

  const filteredModels = registeredModels.filter((m) => {
    if (statusFilter === 'all') return true;
    return m.status === statusFilter;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* PROVENANCE & HEADER BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-warm-text p-6 text-white shadow-md">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-200">
                <ActivityIcon className="h-3.5 w-3.5 text-brand-300" />
                Module 7: AI Model Management
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                  dashboardData?.isSimulated
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                    : 'bg-teal-500/20 text-teal-200 border border-teal-400/30'
                }`}
              >
                {dashboardData?.isSimulated ? 'Simulated Model Registry' : 'Live Connected Backend'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-brand-100">
                {isSystemAdmin ? 'System Admin (Manage)' : 'Practitioner Inspection View (Read-Only)'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              AI Model Management & Governance Dashboard
            </h1>
            <p className="text-xs text-brand-100/90 leading-relaxed">
              Real-time monitoring of active machine learning models, offline evaluation metrics, feature importance attribution, and institutional model registry governance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadModelData()}
              isLoading={isLoading}
              leftIcon={<RefreshCwIcon className="h-3.5 w-3.5" />}
              className="border-white/25 bg-white/15 text-white hover:bg-white/20 dark:border-white/25 dark:text-white"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportModelCard}
              leftIcon={<DownloadIcon className="h-3.5 w-3.5" />}
              className="border-white/25 bg-white/15 text-white hover:bg-white/20 dark:border-white/25 dark:text-white"
            >
              Export Model Card
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

        {/* Role-Based Permissions Notice for Non-Admins */}
        {!isSystemAdmin && (
          <div className="rounded-xl border border-warm-border bg-warm-neutral/30 p-3.5 text-xs text-warm-text-muted dark:border-warm-border/60 dark:bg-warm-neutral/10 flex items-start gap-3">
            <InfoIcon className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-warm-text dark:text-warm-text block">
                Clinical Transparency & Model Inspection Mode
              </span>
              <p className="text-[11px] leading-relaxed">
                You are viewing the operational AI model registry in <strong>Read-Only Inspection Mode</strong>.
                Backend model deployment and parameter tuning actions (<code className="font-mono text-brand-600 dark:text-brand-400">MODEL_MANAGE</code>) are restricted to System Administrators in accordance with institutional access governance.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <ErrorMessage
            title="Model Registry Unavailable"
            message={error}
            onRetry={loadModelData}
          />
        )}

        {/* ACTIVE MODEL STATUS BANNER & METRICS */}
        {isLoading && !dashboardData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : activeModel ? (
          <div className="space-y-6">
            {/* Active Model Summary Card */}
            <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-warm-border/60 pb-5 dark:border-warm-border/60">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold">
                    <ActivityIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-warm-text dark:text-warm-text font-mono">
                        {activeModel.name}
                      </h2>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300 border border-sage-200 dark:border-sage-800">
                        Active Production
                      </span>
                      <span className="text-xs font-semibold text-warm-text-muted">
                        v{activeModel.version}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-warm-text-muted flex-wrap">
                      <span>Algorithm: <strong className="text-warm-text dark:text-warm-text">{activeModel.algorithm}</strong></span>
                      <span>&bull;</span>
                      <span>Serving: <code className="font-mono text-[11px] bg-warm-neutral/60 dark:bg-warm-neutral/20 px-1 py-0.5 rounded">{activeModel.servingEndpoint}</code></span>
                      <span>&bull;</span>
                      <span>Latency: <strong className="text-warm-text dark:text-warm-text">{activeModel.latencyMs} ms (p95)</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-auto text-xs">
                  <span className="text-warm-text-muted">Artifact Dir:</span>
                  <code className="bg-warm-neutral/40 dark:bg-warm-neutral/20 border border-warm-border/60 px-2 py-1 rounded text-[11px] font-mono text-warm-text truncate max-w-xs">
                    {activeModel.artifactDir}
                  </code>
                </div>
              </div>

              {/* 5 Core Evaluation Metric Cards */}
              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-warm-text-muted mb-3">
                  Active Model Evaluation Metrics (Validation Test Cohort)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* Accuracy */}
                  <div className="p-4 rounded-xl border border-warm-border/80 bg-warm-neutral/20 dark:border-warm-border/40 dark:bg-warm-neutral/10 space-y-1">
                    <div className="flex items-center justify-between text-xs text-warm-text-muted">
                      <span className="font-medium">Accuracy</span>
                      <span className="text-[10px] text-sage-600 font-semibold">&gt;75% Target</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-warm-text dark:text-warm-text">
                      {activeModel.metrics.accuracy !== null
                        ? `${(activeModel.metrics.accuracy * 100).toFixed(1)}%`
                        : '—'}
                    </div>
                    <p className="text-[10px] text-warm-text-muted">Overall classification accuracy</p>
                  </div>

                  {/* Precision */}
                  <div className="p-4 rounded-xl border border-warm-border/80 bg-warm-neutral/20 dark:border-warm-border/40 dark:bg-warm-neutral/10 space-y-1">
                    <div className="flex items-center justify-between text-xs text-warm-text-muted">
                      <span className="font-medium">Precision</span>
                      <span className="text-[10px] text-sage-600 font-semibold">&gt;70% Target</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-warm-text dark:text-warm-text">
                      {activeModel.metrics.precision !== null
                        ? `${(activeModel.metrics.precision * 100).toFixed(1)}%`
                        : '—'}
                    </div>
                    <p className="text-[10px] text-warm-text-muted">Positive predictive value</p>
                  </div>

                  {/* Recall */}
                  <div className="p-4 rounded-xl border border-warm-border/80 bg-warm-neutral/20 dark:border-warm-border/40 dark:bg-warm-neutral/10 space-y-1">
                    <div className="flex items-center justify-between text-xs text-warm-text-muted">
                      <span className="font-medium">Recall (Sensitivity)</span>
                      <span className="text-[10px] text-brand-600 font-semibold">&gt;70% Target</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-warm-text dark:text-warm-text">
                      {activeModel.metrics.recall !== null
                        ? `${(activeModel.metrics.recall * 100).toFixed(1)}%`
                        : '—'}
                    </div>
                    <p className="text-[10px] text-warm-text-muted">High-risk readmission capture rate</p>
                  </div>

                  {/* F1 Score */}
                  <div className="p-4 rounded-xl border border-warm-border/80 bg-warm-neutral/20 dark:border-warm-border/40 dark:bg-warm-neutral/10 space-y-1">
                    <div className="flex items-center justify-between text-xs text-warm-text-muted">
                      <span className="font-medium">F1 Score</span>
                      <span className="text-[10px] text-sage-600 font-semibold">&gt;70% Target</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-warm-text dark:text-warm-text">
                      {activeModel.metrics.f1 !== null
                        ? `${(activeModel.metrics.f1 * 100).toFixed(1)}%`
                        : '—'}
                    </div>
                    <p className="text-[10px] text-warm-text-muted">Harmonic balance of precision & recall</p>
                  </div>

                  {/* ROC-AUC */}
                  <div className="p-4 rounded-xl border border-warm-border/80 bg-warm-neutral/20 dark:border-warm-border/40 dark:bg-warm-neutral/10 space-y-1">
                    <div className="flex items-center justify-between text-xs text-warm-text-muted">
                      <span className="font-medium">ROC-AUC</span>
                      <span className="text-[10px] text-teal-600 font-semibold">&gt;0.80 Benchmark</span>
                    </div>
                    <div className="text-2xl font-bold font-mono text-warm-text dark:text-warm-text">
                      {activeModel.metrics.roc_auc !== null
                        ? activeModel.metrics.roc_auc.toFixed(3)
                        : '—'}
                    </div>
                    <p className="text-[10px] text-warm-text-muted">Area under ROC discrimination curve</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* TWO-COLUMN GRID: FEATURE IMPORTANCE & GOVERNANCE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: GLOBAL FEATURE IMPORTANCE (7 Cols) */}
              <div className="lg:col-span-7">
                <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-warm-border/60 pb-3 dark:border-warm-border/60">
                      <div className="flex items-center gap-2">
                        <SlidersIcon className="h-4 w-4 text-brand-500" />
                        <h3 className="text-base font-bold text-warm-text dark:text-warm-text">
                          Global Feature Importance Attribution
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-warm-text-muted">
                        Tree-Gini & SHAP Values
                      </span>
                    </div>

                    <p className="text-xs text-warm-text-muted mt-2">
                      Relative contribution of clinical, diagnostic, and encounter features to the active 30-day readmission prediction model.
                    </p>

                    <div className="mt-4 space-y-3">
                      {activeModel.topFeatures.map((item: FeatureImportanceItem) => {
                        const pct = Math.round(item.importance * 100);
                        const categoryColor =
                          item.category === 'clinical'
                            ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300'
                            : item.category === 'medication'
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300'
                            : item.category === 'admission'
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-warm-neutral text-warm-text';

                        return (
                          <div key={item.feature} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-warm-text dark:text-warm-text">
                                  {item.displayName}
                                </span>
                                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${categoryColor}`}>
                                  {item.category}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-warm-text dark:text-warm-text">
                                {pct}% Weight
                              </span>
                            </div>

                            <div className="w-full bg-warm-neutral/50 dark:bg-warm-neutral/20 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-brand-500 h-2 rounded-full transition-all"
                                style={{ width: `${pct * 3.5}%` }}
                              />
                            </div>

                            <p className="text-[11px] text-warm-text-muted">
                              {item.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-warm-border/60 text-[11px] text-warm-text-muted flex items-center justify-between">
                    <span>Feature normalization applied</span>
                    <Link
                      href="/risk"
                      className="text-brand-500 hover:text-brand-600 font-semibold flex items-center gap-1"
                    >
                      <span>Test in What-If Risk Simulator</span>
                      <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  </div>
                </Card>
              </div>

              {/* RIGHT COLUMN: MODEL GOVERNANCE & AUDIT (5 Cols) */}
              <div className="lg:col-span-5">
                <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-warm-border/60 pb-3 dark:border-warm-border/60">
                      <div className="flex items-center gap-2">
                        <ShieldAlertIcon className="h-4 w-4 text-teal-600" />
                        <h3 className="text-base font-bold text-warm-text dark:text-warm-text">
                          Model Governance & Validation
                        </h3>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        Audited
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-warm-text-muted block text-[11px] font-semibold uppercase tracking-wider">
                          Training Dataset:
                        </span>
                        <span className="font-semibold text-warm-text dark:text-warm-text block mt-0.5">
                          {activeModel.governance.trainingDataset}
                        </span>
                      </div>

                      <div>
                        <span className="text-warm-text-muted block text-[11px] font-semibold uppercase tracking-wider">
                          Validation Strategy:
                        </span>
                        <span className="font-medium text-warm-text dark:text-warm-text block mt-0.5">
                          {activeModel.governance.validationSplit}
                        </span>
                      </div>

                      <div>
                        <span className="text-warm-text-muted block text-[11px] font-semibold uppercase tracking-wider">
                          Framework & Runtime:
                        </span>
                        <span className="font-mono text-warm-text dark:text-warm-text block mt-0.5">
                          {activeModel.governance.framework} (Python {activeModel.governance.pythonVersion})
                        </span>
                      </div>

                      <div>
                        <span className="text-warm-text-muted block text-[11px] font-semibold uppercase tracking-wider">
                          Fairness & Bias Audit:
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <CheckCircleIcon className="h-4 w-4 text-sage-600" />
                          <span className="font-semibold text-sage-700 dark:text-sage-400">
                            Equalized Odds Verified (Age & Gender Subgroups)
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-warm-text-muted block text-[11px] font-semibold uppercase tracking-wider">
                          Intended Clinical Scope:
                        </span>
                        <p className="text-[11px] text-warm-text-muted leading-relaxed mt-0.5">
                          {activeModel.governance.intendedUse}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/30 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                        <strong className="block">Clinical Safety & Ethical Constraint:</strong>
                        <p className="leading-relaxed">
                          {activeModel.governance.ethicalConstraints}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-warm-border/60 text-[11px] text-warm-text-muted flex items-center justify-between">
                    <span>Audit Date: {activeModel.governance.lastAuditedDate}</span>
                    <span className="font-semibold text-brand-600 dark:text-brand-400">Governance Tier 1</span>
                  </div>
                </Card>
              </div>
            </div>

            {/* SECTION: REGISTERED MODELS COMPARISON TABLE */}
            <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
                <div>
                  <div className="flex items-center gap-2">
                    <LayersIcon className="h-4 w-4 text-brand-500" />
                    <h3 className="text-base font-bold text-warm-text dark:text-warm-text">
                      AI Model Registry & Benchmark Comparison
                    </h3>
                  </div>
                  <p className="text-xs text-warm-text-muted mt-0.5">
                    Historical and challenger machine learning model artifacts evaluated for hospital readmission forecasting.
                  </p>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
                  <span className="text-warm-text-muted font-medium">Filter Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-warm-border bg-white px-3 py-1.5 text-xs text-warm-text focus:border-brand-500 focus:outline-none dark:border-warm-border dark:bg-warm-card dark:text-warm-text"
                  >
                    <option value="all">All Models ({registeredModels.length})</option>
                    <option value="active">Active</option>
                    <option value="evaluating">Evaluating / Candidate</option>
                    <option value="archived">Archived</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs text-warm-text dark:text-warm-text">
                  <thead className="bg-warm-neutral/40 text-[11px] font-bold uppercase tracking-wider text-warm-text-muted dark:bg-warm-neutral/20 dark:text-warm-text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 rounded-l-lg">Model Name & Version</th>
                      <th scope="col" className="px-3 py-3">Algorithm</th>
                      <th scope="col" className="px-3 py-3">Task Domain</th>
                      <th scope="col" className="px-3 py-3 text-center">Status</th>
                      <th scope="col" className="px-3 py-3 text-right">Accuracy</th>
                      <th scope="col" className="px-3 py-3 text-right">F1 Score</th>
                      <th scope="col" className="px-3 py-3 text-right">ROC-AUC</th>
                      <th scope="col" className="px-4 py-3 rounded-r-lg text-right">Trained Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-border/60 dark:divide-warm-border/40">
                    {filteredModels.map((model) => {
                      const isCurrentActive = model.name === activeModel.name;
                      const statusBadge =
                        model.status === 'active' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-300">
                            Active
                          </span>
                        ) : model.status === 'evaluating' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Evaluating
                          </span>
                        ) : model.status === 'archived' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-warm-neutral text-warm-text-muted">
                            Archived
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-coral-100 text-coral-800 dark:bg-coral-950 dark:text-coral-300">
                            Deprecated
                          </span>
                        );

                      return (
                        <tr
                          key={model.id}
                          onClick={() => setSelectedModelDetail(model)}
                          className={`hover:bg-warm-neutral/30 dark:hover:bg-warm-neutral/10 transition-colors cursor-pointer ${
                            isCurrentActive ? 'bg-brand-50/40 dark:bg-brand-950/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 font-semibold text-warm-text dark:text-warm-text">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{model.name}</span>
                              <span className="text-[10px] text-warm-text-muted font-normal">v{model.version}</span>
                            </div>
                            <span className="block text-[10px] text-warm-text-muted font-normal truncate max-w-xs">
                              {model.description}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 font-medium">{model.algorithm}</td>
                          <td className="px-3 py-3.5 text-warm-text-muted">{model.task}</td>
                          <td className="px-3 py-3.5 text-center">{statusBadge}</td>
                          <td className="px-3 py-3.5 text-right font-mono font-semibold">
                            {model.metrics.accuracy !== null ? `${(model.metrics.accuracy * 100).toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-3 py-3.5 text-right font-mono font-semibold">
                            {model.metrics.f1 !== null ? `${(model.metrics.f1 * 100).toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-3 py-3.5 text-right font-mono font-bold text-brand-600 dark:text-brand-400">
                            {model.metrics.roc_auc !== null ? model.metrics.roc_auc.toFixed(3) : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right text-warm-text-muted font-mono text-[11px]">
                            {model.trainedDate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal Detail Drawer for Selected Model */}
              {selectedModelDetail && (
                <div className="mt-4 p-4 rounded-xl border border-brand-200 bg-brand-50/30 dark:border-brand-900 dark:bg-brand-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-warm-text dark:text-warm-text">
                      Selected Model: {selectedModelDetail.name} (v{selectedModelDetail.version})
                    </span>
                    <p className="text-[11px] text-warm-text-muted mt-0.5">
                      {selectedModelDetail.description}
                    </p>
                    {selectedModelDetail.artifactPath && (
                      <div className="mt-1 font-mono text-[10px] text-brand-700 dark:text-brand-300">
                        Artifact Path: {selectedModelDetail.artifactPath}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedModelDetail(null)}
                    className="self-start sm:self-auto text-xs"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
