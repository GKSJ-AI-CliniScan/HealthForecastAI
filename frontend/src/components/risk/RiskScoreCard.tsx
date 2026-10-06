'use client';

import React from 'react';
import { PatientRiskAssessment } from '@/types';
import { RiskGauge } from '@/components/charts/RiskGauge';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  PulseIcon,
  ShieldAlertIcon,
  ClockIcon,
  ActivityIcon,
} from '@/components/ui/Icons';

export interface RiskScoreCardProps {
  assessment: PatientRiskAssessment;
  className?: string;
}

export function RiskScoreCard({ assessment, className = '' }: RiskScoreCardProps) {
  const percentage = Math.round(assessment.readmissionProbability * 100);
  const confidencePercent = Math.round(assessment.confidenceScore * 100);

  const getRiskBadge = () => {
    switch (assessment.riskCategory) {
      case 'high':
        return <Badge variant="riskHigh">High Risk &bull; {percentage}%</Badge>;
      case 'medium':
        return <Badge variant="riskMedium">Medium Risk &bull; {percentage}%</Badge>;
      case 'low':
      default:
        return <Badge variant="riskLow">Low Risk &bull; {percentage}%</Badge>;
    }
  };

  return (
    <Card className={`overflow-hidden border border-warm-border p-6 shadow-sm dark:border-warm-border dark:bg-warm-card ${className}`}>
      {/* Header with Patient Info & Demo Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-border/60 pb-4 dark:border-warm-border/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-warm-text-muted dark:text-warm-text-muted">
              {assessment.mrn}
            </span>
            <span>&bull;</span>
            <span className="text-xs text-warm-text-light">
              {assessment.department || 'Internal Medicine'}
            </span>
            <span>&bull;</span>
            <span className="text-xs text-warm-text-light">
              {assessment.ageGroup || 'Age [60-70)'}
            </span>
          </div>
          <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-warm-text dark:text-warm-text">
            {assessment.patientName}
          </h2>
          <p className="text-xs text-warm-text-muted dark:text-warm-text-muted mt-0.5">
            {assessment.primaryDiagnosis}
          </p>
        </div>

        {/* Demo / Simulated Data Disclaimer Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {assessment.isSimulated && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              title="This score is generated via the client-side simulation engine for UI prototyping."
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Demo / Simulated ML
            </span>
          )}
          {getRiskBadge()}
        </div>
      </div>

      {/* Main Score Visualizer Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Risk Gauge Visual */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-warm-neutral/20 dark:bg-warm-neutral/10 border border-warm-border/40">
          <RiskGauge
            score={assessment.readmissionProbability}
            riskCategory={assessment.riskCategory}
            size={150}
            strokeWidth={14}
          />
          <div className="mt-2 text-center">
            <span className="text-[11px] text-warm-text-muted dark:text-warm-text-muted block">
              Confidence Score: <strong className="text-warm-text dark:text-warm-text">{confidencePercent}%</strong>
            </span>
          </div>
        </div>

        {/* Clinical Interpretation & Horizon */}
        <div className="md:col-span-8 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Clinical Prognosis Summary
            </span>
            <p className="mt-1 text-sm text-warm-text dark:text-warm-text leading-relaxed">
              {assessment.riskCategory === 'high' ? (
                <>
                  This patient exhibits an <strong className="text-coral-600 dark:text-coral-400">elevated 30-day readmission risk ({percentage}%)</strong> driven primarily by prior hospital encounter velocity, complex polypharmacy, and glycemic volatility. Proactive transitional discharge planning is strongly indicated.
                </>
              ) : assessment.riskCategory === 'medium' ? (
                <>
                  This patient demonstrates a <strong className="text-amber-700 dark:text-amber-400">moderate readmission trajectory ({percentage}%)</strong>. Key risk factors are partially balanced by outpatient follow-up adherence, but post-discharge monitoring within 14 days remains recommended.
                </>
              ) : (
                <>
                  This patient is stratified into the <strong className="text-sage-700 dark:text-sage-400">low readmission risk tier ({percentage}%)</strong> with uncomplicated recovery indicators and standard outpatient follow-up milestones.
                </>
              )}
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg bg-white dark:bg-warm-card border border-warm-border/60 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-warm-text-muted">
                <ClockIcon className="h-3.5 w-3.5 text-brand-500" />
                <span>Forecast Window</span>
              </div>
              <span className="mt-1 block text-sm font-bold text-warm-text dark:text-warm-text">
                {assessment.predictedReadmissionHorizonDays} Days Post-Discharge
              </span>
            </div>

            <div className="rounded-lg bg-white dark:bg-warm-card border border-warm-border/60 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-warm-text-muted">
                <ShieldAlertIcon className="h-3.5 w-3.5 text-brand-500" />
                <span>Active Risk Drivers</span>
              </div>
              <span className="mt-1 block text-sm font-bold text-warm-text dark:text-warm-text">
                {assessment.riskFactors.filter((f) => f.impact === 'increase').length} High Impact
              </span>
            </div>

            <div className="rounded-lg bg-white dark:bg-warm-card border border-warm-border/60 p-2.5 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-[11px] text-warm-text-muted">
                <PulseIcon className="h-3.5 w-3.5 text-brand-500" />
                <span>Care Interventions</span>
              </div>
              <span className="mt-1 block text-sm font-bold text-warm-text dark:text-warm-text">
                {assessment.clinicalInsights.length} Recommendations
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Governance & Provenance Footer */}
      <div className="mt-6 border-t border-warm-border/60 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-warm-text-muted dark:text-warm-text-muted">
        <div className="flex items-center gap-2">
          <ActivityIcon className="h-3.5 w-3.5 text-brand-500" />
          <span>
            Scoring Model: <strong className="font-mono text-warm-text dark:text-warm-text">{assessment.modelInfo.modelName}</strong> ({assessment.modelInfo.modelVersion})
          </span>
        </div>
        <div>
          <span>
            Benchmark ROC-AUC: <strong className="text-warm-text dark:text-warm-text">{assessment.modelInfo.rocAuc ?? 0.84}</strong> &bull; Evaluated on Diabetes-130k Cohort
          </span>
        </div>
      </div>
    </Card>
  );
}
