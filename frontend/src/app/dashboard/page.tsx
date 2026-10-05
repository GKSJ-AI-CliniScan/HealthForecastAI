'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RoleSwitcher } from '@/components/dashboard/RoleSwitcher';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { PatientListTable } from '@/components/patients/PatientListTable';
import { patientService } from '@/services/patientService';
import { useAuth } from '@/lib/auth-context';
import { DashboardStats, Patient, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  PulseIcon,
  ArrowRightIcon,
  RefreshCwIcon,
} from '@/components/ui/Icons';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const currentRole = user?.role ?? 'doctor';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Protected route guard: Redirect to /login if unauthenticated
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsResult, patientsResult] = await Promise.all([
        patientService.getDashboardStats(currentRole),
        patientService.getPatients({}, currentRole, 5),
      ]);
      setStats(statsResult);
      setPatients(patientsResult.patients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard intelligence.');
    } finally {
      setIsLoading(false);
    }
  }, [currentRole]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const roleTitle = ROLE_LABELS[currentRole];
  const roleDescription = ROLE_DESCRIPTIONS[currentRole];

  if (!isInitialized || !user) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <LoadingState
            title="Authenticating Session..."
            description="Verifying practitioner credentials for protected dashboard access."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Role Switcher Toolbar for Reviewers / Milestone 1 Testing */}
        <RoleSwitcher />

        {/* Dashboard Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-warm-text p-6 text-white shadow-md">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-200">
                <PulseIcon className="h-3.5 w-3.5 animate-pulse text-brand-300" />
                {roleTitle} Workspace
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Welcome back, {user?.full_name || 'Healthcare Practitioner'}
            </h1>
            <p className="text-xs text-brand-100/90 leading-relaxed">
              {roleDescription}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadDashboardData()}
              isLoading={isLoading}
              leftIcon={<RefreshCwIcon className="h-3.5 w-3.5" />}
              className="border-white/25 bg-white/15 text-white hover:bg-white/20 dark:border-white/25 dark:text-white"
            >
              Refresh
            </Button>
            <Link href="/patients">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRightIcon className="h-3.5 w-3.5" />}
                className="bg-brand-500 hover:bg-brand-600 text-white shadow"
              >
                {currentRole === 'researcher' ? 'Explore Cohorts' : 'Patient Roster'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <ErrorMessage
            title="Failed to Load Dashboard Data"
            message={error}
            onRetry={loadDashboardData}
          />
        )}

        {/* KPI Metrics Overview */}
        <StatsOverview stats={stats} isLoading={isLoading} />

        {/* High Priority Patient Activity / Cohorts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-warm-text dark:text-warm-text">
                {currentRole === 'researcher'
                  ? 'Recent De-Identified Cohort Samples'
                  : 'High Priority Patient Monitoring'}
              </h3>
              <p className="text-[11px] text-warm-text-muted dark:text-warm-text-muted">
                {currentRole === 'researcher'
                  ? 'Sample entries from the Diabetes 130-US Hospitals dataset.'
                  : 'Patients requiring close readmission risk observation.'}
              </p>
            </div>
            <Link
              href="/patients"
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 flex items-center gap-1"
            >
              <span>View All Patients</span>
              <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>

          <PatientListTable
            patients={patients}
            role={currentRole}
            isLoading={isLoading}
          />
        </div>
      </div>
    </AppShell>
  );
}
