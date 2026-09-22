'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { clinicalSupportService } from '@/services/clinicalSupportService';
import { patientService } from '@/services/patientService';
import {
  PatientClinicalSupportSummary,
  CareRecommendationItem,
  MitigationStep,
} from '@/types/clinicalSupport';
import { Patient } from '@/types';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  StethoscopeIcon,
  ShieldAlertIcon,
  ActivityIcon,
  UsersIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  InfoIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  PulseIcon,
} from '@/components/ui/Icons';

export default function ClinicalDecisionSupportPage() {
  const router = useRouter();
  const { user, isInitialized, token } = useAuth();

  // Protected route guard: Redirect to /login if unauthenticated
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [dossier, setDossier] = useState<PatientClinicalSupportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive recommendation status tracking
  const [recommendationStatuses, setRecommendationStatuses] = useState<
    Record<string, 'pending' | 'accepted' | 'deferred'>
  >({});

  // Interactive mitigation task completion tracking
  const [completedMitigations, setCompletedMitigations] = useState<Record<string, boolean>>({});

  // Load patient list for the selector
  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await patientService.getPatients({}, user?.role ?? 'doctor', 20);
        setPatientList(res.patients);
      } catch {
        // Fallback handled silently
      }
    }
    void loadPatients();
  }, [user]);

  const loadClinicalSupportData = useCallback(
    async (patientId: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await clinicalSupportService.getClinicalSupportSummary(
          patientId,
          token ?? undefined,
        );
        setDossier(data);

        // Initialize status map for recommendations
        const recStatus: Record<string, 'pending' | 'accepted' | 'deferred'> = {};
        data.recommendations.forEach((r) => {
          recStatus[r.id] = r.status || 'pending';
        });
        setRecommendationStatuses(recStatus);

        // Initialize mitigation completion map
        const mitStatus: Record<string, boolean> = {};
        data.discharge_plan.risk_mitigation.forEach((m, idx) => {
          if (typeof m === 'object') {
            mitStatus[m.id || `mit-${idx}`] = !!m.completed;
          }
        });
        setCompletedMitigations(mitStatus);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load clinical decision support dossier.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void loadClinicalSupportData(selectedPatientId);
  }, [loadClinicalSupportData, selectedPatientId]);

  const handlePatientSelect = (id: number) => {
    setSelectedPatientId(id);
  };

  const handleToggleRecStatus = (recId: string, status: 'accepted' | 'deferred') => {
    setRecommendationStatuses((prev) => ({
      ...prev,
      [recId]: prev[recId] === status ? 'pending' : status,
    }));
  };

  const handleToggleMitigation = (mitId: string) => {
    setCompletedMitigations((prev) => ({
      ...prev,
      [mitId]: !prev[mitId],
    }));
  };

  if (!isInitialized || !user) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState
            title="Authenticating Clinical Decision Support..."
            description="Verifying practitioner credentials for patient risk review."
          />
        </div>
      </AppShell>
    );
  }

  const riskBadgeVariant =
    dossier?.risk_category === 'high'
      ? 'riskHigh'
      : dossier?.risk_category === 'medium'
      ? 'riskMedium'
      : 'riskLow';

  const readinessScore = dossier?.discharge_plan.readiness_score ?? 60;
  const isReadyForDischarge = dossier?.discharge_plan.ready_for_discharge;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Clinical Workstation Welcome & Provenance Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-warm-text p-6 text-white shadow-md">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-200">
                <StethoscopeIcon className="h-3.5 w-3.5 text-brand-300" />
                Clinical Decision Support
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/20 px-2 py-0.5 text-[10px] font-medium text-teal-200">
                {dossier?.isSimulated ? 'Simulated Clinical Data' : 'Live Connected Backend'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Physician Decision Support & Care Coordination
            </h1>
            <p className="text-xs text-brand-100/90 leading-relaxed">
              Evidence-based care recommendations, explainable risk drivers, and structured discharge readiness indicators.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadClinicalSupportData(selectedPatientId)}
              isLoading={isLoading}
              leftIcon={<RefreshCwIcon className="h-3.5 w-3.5" />}
              className="border-white/25 bg-white/15 text-white hover:bg-white/20 dark:border-white/25 dark:text-white"
            >
              Refresh
            </Button>
            <Link href="/risk">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRightIcon className="h-3.5 w-3.5" />}
                className="bg-brand-500 hover:bg-brand-600 text-white shadow"
              >
                Risk Predictor
              </Button>
            </Link>
          </div>
        </div>

        {/* PATIENT SELECTOR & CLINICAL CONTEXT BANNER */}
        <Card className="p-5 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Patient Dropdown Selector */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold text-sm">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div>
                <label
                  htmlFor="patient-select"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-warm-text-muted dark:text-warm-text-muted"
                >
                  Select Patient Record:
                </label>
                <select
                  id="patient-select"
                  value={selectedPatientId}
                  onChange={(e) => handlePatientSelect(Number(e.target.value))}
                  className="mt-1 rounded-lg border border-warm-border bg-white px-3 py-1.5 text-xs font-semibold text-warm-text focus:border-brand-500 focus:outline-none dark:border-warm-border dark:bg-warm-card dark:text-warm-text min-w-[240px]"
                >
                  {patientList.length > 0 ? (
                    patientList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.name || `Patient #${p.id}`} ({p.medical_record_number}) — {p.risk_category?.toUpperCase() || 'MODERATE'} RISK
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={1}>Eleanor Vance (MRN-10029) — HIGH RISK</option>
                      <option value={2}>Arthur Pendelton (MRN-10045) — HIGH RISK</option>
                      <option value={3}>Clara Oswald (MRN-10082) — MEDIUM RISK</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Quick Context Chips */}
            {dossier && (
              <div className="flex flex-wrap items-center gap-4 text-xs border-t lg:border-t-0 lg:border-l border-warm-border/60 pt-3 lg:pt-0 lg:pl-6 dark:border-warm-border/60">
                <div>
                  <span className="text-[10px] text-warm-text-light block">Primary Diagnosis</span>
                  <span className="font-semibold text-warm-text dark:text-warm-text block max-w-xs truncate" title={dossier.primary_diagnosis}>
                    {dossier.primary_diagnosis}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-warm-text-light block">Admission Status</span>
                  <span className="font-medium text-warm-text dark:text-warm-text capitalize">
                    {dossier.admission_status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-warm-text-light block">Readmission Risk</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant={riskBadgeVariant}>
                      {dossier.risk_category.toUpperCase()} ({Math.round(dossier.readmission_probability * 100)}%)
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && !dossier && (
          <LoadingState
            title="Analyzing Patient Clinical Dossier..."
            description="Evaluating drug interactions, glycemic parameters, and discharge milestones."
          />
        )}

        {/* Error State */}
        {error && (
          <ErrorMessage
            title="Clinical Dossier Unavailable"
            message={error}
            onRetry={() => loadClinicalSupportData(selectedPatientId)}
          />
        )}

        {/* MAIN DECISION SUPPORT SECTIONS */}
        {dossier && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: CARE RECOMMENDATIONS & RISK DRIVERS (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* SECTION 1: CARE RECOMMENDATIONS */}
              <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm">
                <div className="flex items-center justify-between border-b border-warm-border/60 pb-3 dark:border-warm-border/60">
                  <div className="flex items-center gap-2">
                    <PulseIcon className="h-4 w-4 text-brand-500" />
                    <h3 className="text-base font-bold text-warm-text dark:text-warm-text">
                      Tailored Care Recommendations
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-warm-text-muted">
                    {dossier.recommendations.length} Active Protocols
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {dossier.recommendations.map((rec: CareRecommendationItem) => {
                    const status = recommendationStatuses[rec.id] || 'pending';
                    const priorityBadge =
                      rec.priority === 'critical' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-coral-100 text-coral-800 dark:bg-coral-950/80 dark:text-coral-300">
                          Critical
                        </span>
                      ) : rec.priority === 'high' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                          High Priority
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sage-100 text-sage-800 dark:bg-sage-950/80 dark:text-sage-300">
                          Standard
                        </span>
                      );

                    return (
                      <div
                        key={rec.id}
                        className={`p-4 rounded-xl border transition-all ${
                          status === 'accepted'
                            ? 'border-sage-300 bg-sage-50/40 dark:border-sage-800 dark:bg-sage-950/20'
                            : status === 'deferred'
                            ? 'border-warm-border/40 bg-warm-neutral/20 opacity-60 dark:border-warm-border/20'
                            : 'border-warm-border bg-white dark:border-warm-border dark:bg-warm-card shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {priorityBadge}
                              <span className="text-[11px] font-semibold text-warm-text-muted flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" />
                                {rec.suggested_timeframe}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-warm-text dark:text-warm-text pt-1">
                              {rec.title}
                            </h4>
                          </div>

                          {/* Quick Decision Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 self-start">
                            <button
                              type="button"
                              onClick={() => handleToggleRecStatus(rec.id, 'accepted')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                status === 'accepted'
                                  ? 'bg-sage-600 text-white shadow-xs'
                                  : 'bg-warm-neutral/60 text-warm-text hover:bg-sage-100 hover:text-sage-800 dark:bg-warm-neutral/20 dark:hover:bg-sage-950/60'
                              }`}
                            >
                              {status === 'accepted' ? '✓ Accepted' : 'Accept'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleRecStatus(rec.id, 'deferred')}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                status === 'deferred'
                                  ? 'bg-warm-neutral text-warm-text font-semibold'
                                  : 'text-warm-text-muted hover:bg-warm-neutral/40 hover:text-warm-text'
                              }`}
                            >
                              {status === 'deferred' ? 'Deferred' : 'Defer'}
                            </button>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-warm-text-muted leading-relaxed">
                          <strong className="text-warm-text dark:text-warm-text">Clinical Rationale:</strong>{' '}
                          {rec.rationale}
                        </p>

                        <div className="mt-2.5 p-2.5 rounded-lg bg-warm-neutral/30 dark:bg-warm-neutral/10 border border-warm-border/50 text-xs text-warm-text">
                          <span className="font-semibold text-brand-600 dark:text-brand-400 block text-[11px] uppercase tracking-wider">
                            Recommended Protocol Action:
                          </span>
                          <span className="text-[11px] text-warm-text mt-0.5 block">
                            {rec.protocol_action}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* SECTION 2: RISK DRIVERS */}
              <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm">
                <div className="flex items-center justify-between border-b border-warm-border/60 pb-3 dark:border-warm-border/60">
                  <div className="flex items-center gap-2">
                    <ShieldAlertIcon className="h-4 w-4 text-coral-500" />
                    <h3 className="text-base font-bold text-warm-text dark:text-warm-text">
                      Key Clinical & Physiological Risk Drivers
                    </h3>
                  </div>
                  <span className="text-xs text-warm-text-muted">
                    SHAP-Derived Explanations
                  </span>
                </div>

                <div className="mt-4 space-y-3.5">
                  {dossier.risk_drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="p-3.5 rounded-xl border border-warm-border/80 bg-warm-neutral/20 dark:border-warm-border/40 dark:bg-warm-neutral/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              driver.impact === 'high'
                                ? 'bg-coral-500'
                                : driver.impact === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-sage-500'
                            }`}
                          />
                          <span className="font-bold text-xs text-warm-text dark:text-warm-text">
                            {driver.driver_name}
                          </span>
                        </div>
                        {driver.contribution_percent && (
                          <span className="text-xs font-mono font-bold text-coral-600 dark:text-coral-400">
                            +{driver.contribution_percent}% Risk Impact
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-warm-card p-2 rounded-lg border border-warm-border/60">
                        <div>
                          <span className="text-warm-text-light block">Patient Encounter Value:</span>
                          <span className="font-semibold text-warm-text dark:text-warm-text">
                            {driver.patient_value}
                          </span>
                        </div>
                        <div>
                          <span className="text-warm-text-light block">Clinical Quality Benchmark:</span>
                          <span className="font-mono text-sage-600 dark:text-sage-400 font-medium">
                            {driver.benchmark_value}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-warm-text-muted leading-relaxed">
                        {driver.clinical_significance}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN: DISCHARGE INDICATORS & PLANNING (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 border border-warm-border dark:border-warm-border dark:bg-warm-card shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-warm-border/60 pb-3 dark:border-warm-border/60">
                  <div className="flex items-center gap-2">
                    <ActivityIcon className="h-4 w-4 text-teal-600" />
                    <h3 className="text-base font-bold text-warm-text dark:text-warm-text">
                      Discharge Readiness & Care Transition
                    </h3>
                  </div>
                </div>

                {/* Readiness Score Meter */}
                <div className="p-4 rounded-xl border border-warm-border bg-warm-neutral/20 dark:bg-warm-neutral/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-warm-text dark:text-warm-text">
                      Readiness Index
                    </span>
                    <span className="font-mono text-lg font-bold text-warm-text dark:text-warm-text">
                      {readinessScore} / 100
                    </span>
                  </div>

                  <div className="w-full bg-warm-neutral/60 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        readinessScore >= 80
                          ? 'bg-sage-600'
                          : readinessScore >= 60
                          ? 'bg-amber-500'
                          : 'bg-coral-500'
                      }`}
                      style={{ width: `${readinessScore}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-warm-text-muted">Target: &gt;80 pts</span>
                    <span
                      className={`font-semibold ${
                        isReadyForDischarge
                          ? 'text-sage-600 dark:text-sage-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isReadyForDischarge ? 'Eligible for Discharge Review' : 'Active Inpatient Stabilization'}
                    </span>
                  </div>
                </div>

                {/* Target Discharge Date */}
                {dossier.discharge_plan.target_discharge_date && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-warm-border/60 bg-white dark:bg-warm-card text-xs">
                    <span className="text-warm-text-muted font-medium">Estimated Window:</span>
                    <span className="font-semibold text-brand-600 dark:text-brand-400">
                      {dossier.discharge_plan.target_discharge_date}
                    </span>
                  </div>
                )}

                {/* Discharge Criteria Checklist */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-warm-text-muted">
                    Clinical Discharge Criteria
                  </h4>
                  <div className="space-y-2">
                    {dossier.discharge_plan.criteria.map((crit) => (
                      <div
                        key={crit.id}
                        className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-warm-border/60 text-xs bg-white dark:bg-warm-card"
                      >
                        <div className="flex items-start gap-2">
                          {crit.is_met ? (
                            <CheckCircle2Icon className="h-4 w-4 text-sage-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircleIcon className="h-4 w-4 text-coral-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-semibold text-warm-text dark:text-warm-text block">
                              {crit.label}
                            </span>
                            {crit.recorded_value && (
                              <span className="text-[11px] text-warm-text-muted">
                                Recorded: {crit.recorded_value}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                            crit.is_met
                              ? 'bg-sage-50 text-sage-700 dark:bg-sage-950/80 dark:text-sage-300'
                              : 'bg-coral-50 text-coral-700 dark:bg-coral-950/80 dark:text-coral-300'
                          }`}
                        >
                          {crit.is_met ? 'Met' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Mitigation Steps */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-warm-text-muted">
                    Required Risk Mitigation Actions
                  </h4>
                  <div className="space-y-2">
                    {dossier.discharge_plan.risk_mitigation.map((item, idx) => {
                      const isObj = typeof item === 'object';
                      const id = isObj ? (item as MitigationStep).id : `mit-${idx}`;
                      const actionText = isObj ? (item as MitigationStep).action : (item as string);
                      const role = isObj ? (item as MitigationStep).responsible_role : 'Care Team';
                      const isDone = completedMitigations[id] ?? false;

                      return (
                        <div
                          key={id}
                          onClick={() => handleToggleMitigation(id)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                            isDone
                              ? 'border-sage-300 bg-sage-50/40 text-warm-text-muted line-through dark:border-sage-900'
                              : 'border-warm-border bg-white hover:bg-warm-neutral/30 dark:bg-warm-card'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => handleToggleMitigation(id)}
                            className="mt-0.5 rounded border-warm-border text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-warm-text dark:text-warm-text block">
                              {actionText}
                            </span>
                            <span className="text-[10px] text-warm-text-muted">
                              Assigned: {role}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Post-Discharge Patient Instructions */}
                <div className="space-y-2 pt-2 border-t border-warm-border/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-warm-text-muted">
                    Post-Discharge Instructions Summary
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-warm-text-muted">
                    {dossier.discharge_plan.post_discharge_instructions.map((inst, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-brand-500 font-bold">•</span>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* CLINICAL SAFETY DISCLAIMER BANNER */}
        <div className="rounded-xl border border-warm-border bg-warm-neutral/30 p-4 text-xs text-warm-text-muted dark:border-warm-border/60 dark:bg-warm-neutral/10 flex items-start gap-3">
          <InfoIcon className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-warm-text dark:text-warm-text block">
              Clinical Decision Support Safety & Governance Statement
            </span>
            <p className="leading-relaxed text-[11px]">
              The Clinical Decision Support recommendations and discharge readiness indicators provided by HealthForecast AI are designed strictly to assist licensed healthcare practitioners during clinical review. This interface does not replace independent physician evaluation, diagnostic judgment, or customized bedside patient care planning. Final discharge authorization and treatment prescription remain the sole responsibility of the attending physician.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
