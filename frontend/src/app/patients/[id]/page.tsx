'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { patientService } from '@/services/patientService';
import { PatientDetail } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { PatientBasicInfo } from '@/components/patients/PatientBasicInfo';
import { MedicalHistorySection } from '@/components/patients/MedicalHistorySection';
import { AdmissionHistorySection } from '@/components/patients/AdmissionHistorySection';
import { TreatmentSection } from '@/components/patients/TreatmentSection';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { ArrowLeftIcon, PrinterIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const resolvedParams = use(params);
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Protected route guard: Redirect to /login if unauthenticated
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  // Default active tab is 'basic' (Basic Information)
  const [activeTab, setActiveTab] = useState<'basic' | 'medical' | 'admission' | 'treatment' | 'all'>('basic');

  const loadPatient = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await patientService.getPatientById(resolvedParams.id);
      if (!data) {
        setError(`Patient with ID "${resolvedParams.id}" was not found.`);
      } else {
        setPatient(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve patient medical record.');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    void loadPatient();
  }, [loadPatient]);

  const tabs: { id: 'basic' | 'medical' | 'admission' | 'treatment' | 'all'; label: string }[] = [
    { id: 'basic', label: 'Basic Information' },
    { id: 'medical', label: 'Medical History' },
    { id: 'admission', label: 'Admission History' },
    { id: 'treatment', label: 'Treatment & Care' },
    { id: 'all', label: 'All Sections' },
  ];

  if (!isInitialized || !user) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState
            title="Authenticating Session..."
            description="Verifying practitioner credentials for patient dossier access."
          />
        </div>
      </AppShell>
    );
  }

  const patientName = patient
    ? patient.full_name || patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient Record'
    : '';

  const riskBadge = patient ? (
    patient.risk_category === 'high' ? (
      <Badge variant="riskHigh">
        High Risk {patient.readmission_risk_score ? `(${Math.round(patient.readmission_risk_score * 100)}%)` : ''}
      </Badge>
    ) : patient.risk_category === 'medium' ? (
      <Badge variant="riskMedium">
        Medium Risk {patient.readmission_risk_score ? `(${Math.round(patient.readmission_risk_score * 100)}%)` : ''}
      </Badge>
    ) : (
      <Badge variant="riskLow">
        Low Risk {patient.readmission_risk_score ? `(${Math.round(patient.readmission_risk_score * 100)}%)` : ''}
      </Badge>
    )
  ) : null;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Back Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/patients"
              className="inline-flex items-center gap-1.5 rounded-lg border border-warm-border bg-white px-3 py-1.5 text-xs font-semibold text-warm-text hover:bg-warm-bg dark:border-warm-border dark:bg-warm-card dark:text-warm-text dark:hover:bg-warm-neutral/20 transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              <span>&larr; Back to Patient List</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-warm-text-muted dark:text-warm-text-muted font-medium">
              Confidential Clinical Health Record
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              leftIcon={<PrinterIcon className="h-3.5 w-3.5" />}
              className="text-xs border-warm-border text-warm-text hover:bg-warm-bg"
            >
              Print Summary
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <LoadingState
            title="Retrieving patient dossier..."
            description="Assembling clinical history, encounters, and treatment regimens."
          />
        )}

        {/* Error State */}
        {error && !isLoading && (
          <ErrorMessage
            title="Patient Record Unavailable"
            message={error}
            onRetry={loadPatient}
          />
        )}

        {/* Patient Details & Interactive Tabs */}
        {patient && !isLoading && (
          <div className="space-y-6">
            {/* Patient Dossier Header Summary */}
            <div className="rounded-2xl border border-warm-border bg-white p-5 shadow-sm dark:border-warm-border dark:bg-warm-card">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white font-bold text-lg shadow-sm">
                    {patient.first_name && patient.last_name
                      ? `${patient.first_name[0]}${patient.last_name[0]}`
                      : patientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-warm-text dark:text-warm-text">
                        {patientName}
                      </h1>
                      {riskBadge}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-warm-text-muted dark:text-warm-text-muted flex-wrap">
                      <span className="font-mono font-semibold text-warm-text dark:text-warm-text">
                        MRN: {patient.medical_record_number}
                      </span>
                      <span>&bull;</span>
                      <span>{patient.gender || 'Unspecified'}, {patient.age_group || 'Age N/A'}</span>
                      <span>&bull;</span>
                      <span>{patient.department || 'Internal Medicine'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-t lg:border-t-0 lg:border-l border-warm-border/60 pt-3 lg:pt-0 lg:pl-5 dark:border-warm-border/60">
                  <div>
                    <span className="text-warm-text-light text-[11px] block">Primary Diagnosis</span>
                    <span className="font-semibold text-warm-text dark:text-warm-text block truncate max-w-[180px]" title={patient.primary_diagnosis}>
                      {patient.primary_diagnosis}
                    </span>
                  </div>
                  <div>
                    <span className="text-warm-text-light text-[11px] block">Assigned Doctor</span>
                    <span className="font-semibold text-warm-text dark:text-warm-text block truncate max-w-[160px]">
                      {patient.assigned_doctor_name || 'Dr. Sarah Jenkins, MD'}
                    </span>
                  </div>
                  <div>
                    <span className="text-warm-text-light text-[11px] block">Risk Score</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400 block">
                      {patient.readmission_risk_score ? `${Math.round(patient.readmission_risk_score * 100)}% Probability` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Tab Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-warm-border/60 pb-2.5 dark:border-warm-border/60">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-warm-neutral/40 text-warm-text hover:bg-warm-neutral dark:bg-warm-neutral/20 dark:text-warm-text dark:hover:bg-warm-neutral/40'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab: Basic Information (Default) */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <PatientBasicInfo patient={patient} />
              </div>
            )}

            {/* Tab: Medical History */}
            {activeTab === 'medical' && (
              <div className="space-y-6">
                <MedicalHistorySection medicalHistory={patient.medical_history} />
              </div>
            )}

            {/* Tab: Admission History */}
            {activeTab === 'admission' && (
              <div className="space-y-6">
                <AdmissionHistorySection admissions={patient.admissions} />
              </div>
            )}

            {/* Tab: Treatment & Care */}
            {activeTab === 'treatment' && (
              <div className="space-y-6">
                <TreatmentSection treatment={patient.treatment} />
              </div>
            )}

            {/* Tab: All Sections */}
            {activeTab === 'all' && (
              <div className="space-y-6">
                <PatientBasicInfo patient={patient} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <MedicalHistorySection medicalHistory={patient.medical_history} />
                  <TreatmentSection treatment={patient.treatment} />
                </div>
                <AdmissionHistorySection admissions={patient.admissions} />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
