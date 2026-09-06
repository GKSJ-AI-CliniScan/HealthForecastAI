'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PatientSearchBar } from '@/components/patients/PatientSearchBar';
import { PatientListTable } from '@/components/patients/PatientListTable';
import { patientService } from '@/services/patientService';
import { useAuth } from '@/lib/auth-context';
import { Patient, RiskCategory } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { ArrowLeftIcon } from '@/components/ui/Icons';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadingState } from '@/components/ui/LoadingState';

export default function PatientsPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const currentRole = user?.role ?? 'doctor';

  // Protected route guard: Redirect to /login if unauthenticated
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<RiskCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [doctorScope, setDoctorScope] = useState<'all' | 'assigned'>('all');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 250);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await patientService.getPatients(
        {
          searchQuery: debouncedSearch,
          riskCategory: selectedRisk,
          status: selectedStatus,
          scope: doctorScope,
        },
        currentRole,
      );
      setPatients(res.patients);
      setTotalCount(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load patient directory.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedRisk, selectedStatus, doctorScope, currentRole]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRisk('all');
    setSelectedStatus('all');
    setDoctorScope('all');
  };

  if (!isInitialized || !user) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState
            title="Authenticating Session..."
            description="Verifying practitioner credentials for patient registry access."
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
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-warm-text dark:text-warm-text">
              {currentRole === 'researcher' ? 'De-Identified Research Cohort' : 'Patient Management Directory'}
            </h1>
            <p className="mt-0.5 text-xs text-warm-text-muted dark:text-warm-text-muted">
              {currentRole === 'researcher'
                ? 'Anonymized diabetic cohort records with longitudinal treatment & encounter history.'
                : 'Active patient roster with real-time readmission risk stratification and medical records.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              {totalCount} Total Records
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="rounded-xl border border-warm-border bg-white p-4 shadow-sm dark:border-warm-border dark:bg-warm-card">
          <PatientSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedRisk={selectedRisk}
            onRiskChange={setSelectedRisk}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            onReset={handleResetFilters}
            role={currentRole}
            scope={doctorScope}
            onScopeChange={setDoctorScope}
          />
        </div>

        {/* Error state */}
        {error && (
          <ErrorMessage
            title="Failed to Load Patients"
            message={error}
            onRetry={loadPatients}
          />
        )}

        {/* Patient Table */}
        {!error && (
          <PatientListTable
            patients={patients}
            role={currentRole}
            isLoading={isLoading}
          />
        )}
      </div>
    </AppShell>
  );
}
