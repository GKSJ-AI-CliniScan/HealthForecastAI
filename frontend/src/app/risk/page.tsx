'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { predictionService } from '@/services/predictionService';
import { PatientRiskAssessment, RiskPredictionPayload } from '@/types';
import { RiskScoreCard } from '@/components/risk/RiskScoreCard';
import { RiskFactorBreakdown } from '@/components/risk/RiskFactorBreakdown';
import { ClinicalInsightsPanel } from '@/components/risk/ClinicalInsightsPanel';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  UsersIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
  SlidersIcon,
  InfoIcon,
} from '@/components/ui/Icons';

export default function RiskPredictionPage() {
  const router = useRouter();
  const { user, isInitialized, token } = useAuth();

  // Protected route guard
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [assessment, setAssessment] = useState<PatientRiskAssessment | null>(null);
  const [availableAssessments, setAvailableAssessments] = useState<PatientRiskAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // What-If Simulation State
  const [showSimulator, setShowSimulator] = useState(false);
  const [simPayload, setSimPayload] = useState<RiskPredictionPayload>({
    patient_id: 1,
    time_in_hospital: 6,
    num_medications: 18,
    num_lab_procedures: 64,
    number_diagnoses: 9,
    number_inpatient: 2,
    number_emergency: 1,
    change_in_meds: true,
  });

  const loadRiskData = useCallback(async (patientId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const [patientAssessment, allPresets] = await Promise.all([
        predictionService.getPatientRiskAssessment(patientId, token ?? undefined),
        predictionService.getAllAssessments(),
      ]);
      setAssessment(patientAssessment);
      setAvailableAssessments(allPresets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate patient risk assessment.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadRiskData(selectedPatientId);
  }, [loadRiskData, selectedPatientId]);

  const handlePatientSelect = (id: number) => {
    setSelectedPatientId(id);
    const selected = availableAssessments.find((a) => a.patientId === id);
    if (selected) {
      setSimPayload({
        patient_id: id,
        time_in_hospital: id === 1 ? 6 : id === 2 ? 4 : id === 3 ? 3 : 7,
        num_medications: id === 1 ? 18 : id === 2 ? 12 : id === 3 ? 6 : 16,
        num_lab_procedures: id === 1 ? 64 : id === 2 ? 42 : id === 3 ? 31 : 58,
        number_diagnoses: id === 1 ? 9 : id === 2 ? 6 : id === 3 ? 4 : 8,
        number_inpatient: id === 1 ? 2 : id === 2 ? 0 : id === 3 ? 0 : 2,
        number_emergency: id === 1 ? 1 : id === 2 ? 1 : id === 3 ? 0 : 2,
        change_in_meds: id === 1 || id === 4,
      });
    }
  };

  const handleSimulateChange = async (key: keyof RiskPredictionPayload, value: number | boolean) => {
    const updated = { ...simPayload, [key]: value };
    setSimPayload(updated);
    const simResult = await predictionService.calculateWhatIfRisk(updated);
    if (assessment) {
      setAssessment({
        ...simResult,
        patientName: assessment.patientName,
        mrn: assessment.mrn,
        department: assessment.department,
        primaryDiagnosis: assessment.primaryDiagnosis,
      });
    }
  };

  if (!isInitialized || !user) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState
            title="Authenticating Clinical Session..."
            description="Verifying permissions for readmission risk intelligence module."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Breadcrumb Navigation & Header */}
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
                Patient Risk Prediction & Prognostic Scoring
              </h1>
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                Module 3 & 5
              </span>
            </div>
            <p className="mt-0.5 text-xs text-warm-text-muted dark:text-warm-text-muted">
              Machine learning risk assessment engine for 30-day all-cause hospital readmission prediction.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSimulator(!showSimulator)}
              leftIcon={<SlidersIcon className="h-3.5 w-3.5" />}
              className={`text-xs ${
                showSimulator
                  ? 'bg-brand-500 text-white hover:bg-brand-600 border-brand-500'
                  : 'border-warm-border text-warm-text hover:bg-warm-bg'
              }`}
            >
              {showSimulator ? 'Close Simulator' : 'What-If Risk Calculator'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadRiskData(selectedPatientId)}
              isLoading={isLoading}
              leftIcon={<RefreshCwIcon className="h-3.5 w-3.5" />}
              className="text-xs border-warm-border text-warm-text hover:bg-warm-bg"
            >
              Recalculate
            </Button>
          </div>
        </div>

        {/* Prominent Demo & ML Transparency Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white mt-0.5">
              <InfoIcon className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Milestone 2 Demonstrative Risk Intelligence
                </span>
                <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/80 dark:text-amber-200">
                  Simulated Clinical Engine
                </span>
              </div>
              <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Risk probabilities and clinical feature attributions displayed below are simulated artifacts derived from the Diabetes 130-US Hospitals dataset. This interface illustrates the clinician decision support workflow and is structured for direct integration with the FastAPI ML inference backend.
              </p>
            </div>
          </div>
        </div>

        {/* Patient Selection Selector Bar */}
        <div className="rounded-xl border border-warm-border bg-white p-3.5 shadow-sm dark:border-warm-border dark:bg-warm-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-brand-500" />
              <span className="text-xs font-bold text-warm-text dark:text-warm-text">
                Select Patient Profile:
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {availableAssessments.map((p) => {
                const isSelected = selectedPatientId === p.patientId;
                const riskColor =
                  p.riskCategory === 'high'
                    ? 'text-coral-600 dark:text-coral-400'
                    : p.riskCategory === 'medium'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-sage-700 dark:text-sage-400';

                return (
                  <button
                    key={p.patientId}
                    type="button"
                    onClick={() => handlePatientSelect(p.patientId)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-brand-500 text-white shadow-sm ring-1 ring-brand-600 font-semibold'
                        : 'bg-warm-neutral/50 text-warm-text-muted hover:bg-warm-neutral hover:text-warm-text dark:bg-warm-neutral/20 dark:text-warm-text-muted'
                    }`}
                  >
                    <span>{p.patientName}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-white/20 text-white' : riskColor
                      }`}
                    >
                      {Math.round(p.readmissionProbability * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Optional Interactive What-If Simulation Panel */}
        {showSimulator && (
          <Card className="p-5 border-2 border-brand-500/40 bg-brand-50/20 dark:bg-brand-950/20 shadow-md animate-fadeIn">
            <div className="flex items-center justify-between border-b border-warm-border/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <SlidersIcon className="h-4 w-4 text-brand-500" />
                <h3 className="text-sm font-bold text-warm-text dark:text-warm-text">
                  Interactive What-If Simulation Parameters
                </h3>
              </div>
              <span className="text-[11px] text-warm-text-muted">
                Adjust clinical variables to dynamically observe changes in simulated risk score
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Length of Stay */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <label htmlFor="sim-los">Length of Stay (Days):</label>
                  <span className="font-mono text-brand-600">{simPayload.time_in_hospital} d</span>
                </div>
                <input
                  id="sim-los"
                  type="range"
                  min="1"
                  max="14"
                  value={simPayload.time_in_hospital}
                  onChange={(e) => handleSimulateChange('time_in_hospital', parseInt(e.target.value, 10))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Number of Medications */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <label htmlFor="sim-meds">Active Medications:</label>
                  <span className="font-mono text-brand-600">{simPayload.num_medications}</span>
                </div>
                <input
                  id="sim-meds"
                  type="range"
                  min="1"
                  max="35"
                  value={simPayload.num_medications}
                  onChange={(e) => handleSimulateChange('num_medications', parseInt(e.target.value, 10))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Diagnoses Count */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <label htmlFor="sim-diag">Diagnoses Count:</label>
                  <span className="font-mono text-brand-600">{simPayload.number_diagnoses}</span>
                </div>
                <input
                  id="sim-diag"
                  type="range"
                  min="1"
                  max="12"
                  value={simPayload.number_diagnoses}
                  onChange={(e) => handleSimulateChange('number_diagnoses', parseInt(e.target.value, 10))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              {/* Prior Inpatient Admissions */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <label htmlFor="sim-inpatient">Prior Admissions (12mo):</label>
                  <span className="font-mono text-brand-600">{simPayload.number_inpatient ?? 0}</span>
                </div>
                <input
                  id="sim-inpatient"
                  type="range"
                  min="0"
                  max="4"
                  value={simPayload.number_inpatient ?? 0}
                  onChange={(e) => handleSimulateChange('number_inpatient', parseInt(e.target.value, 10))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <LoadingState
            title="Evaluating Patient Biomarkers & Risk Model..."
            description="Extracting clinical features and scoring readmission probability."
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorMessage
            title="Prediction Evaluation Error"
            message={error}
            onRetry={() => void loadRiskData(selectedPatientId)}
          />
        )}

        {/* Main Risk Assessment UI */}
        {assessment && !isLoading && (
          <div className="space-y-6">
            {/* Core Risk Score & Prognosis Card */}
            <RiskScoreCard assessment={assessment} />

            {/* Contributing Risk Factors (SHAP Feature Attribution) */}
            <RiskFactorBreakdown riskFactors={assessment.riskFactors} />

            {/* Clinical Decision Support & Action Recommendations */}
            <ClinicalInsightsPanel insights={assessment.clinicalInsights} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
