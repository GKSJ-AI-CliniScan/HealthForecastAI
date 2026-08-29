import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { PulseIcon, ShieldAlertIcon, UsersIcon, StethoscopeIcon, BarChartIcon } from '@/components/ui/Icons';

export const metadata: Metadata = {
  title: 'Register Healthcare Account | HealthForecast AI',
  description: 'Create an authorized practitioner or administrator account on HealthForecast AI.',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      {/* Return to Dashboard link in corner */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition-colors"
        >
          &larr; Back to Platform
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 mt-6 sm:mt-0">
        {/* Left Side: Role Hierarchy & Compliance Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-brand-500/10 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                <PulseIcon className="h-6 w-6 text-brand-300 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">HealthForecast AI</h2>
                <p className="text-[11px] text-brand-200/80 font-medium uppercase tracking-wider">
                  Role Onboarding
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-bold tracking-tight leading-snug">
                Join the Clinical Intelligence Platform
              </h3>
              <p className="text-xs text-brand-100/80 leading-relaxed">
                Accounts are provisioned based on hospital credentials and role-based access
                governance.
              </p>
            </div>

            {/* Role Capability Overviews */}
            <div className="mt-6 space-y-2.5">
              <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-200">
                  <StethoscopeIcon className="h-4 w-4 text-brand-300" />
                  <span>Doctor</span>
                </div>
                <p className="text-[11px] text-brand-100/70 mt-0.5">
                  Patient risk stratification & readmission prognosis.
                </p>
              </div>

              <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-200">
                  <BarChartIcon className="h-4 w-4 text-brand-300" />
                  <span>Hospital Administrator</span>
                </div>
                <p className="text-[11px] text-brand-100/70 mt-0.5">
                  Bed capacity, length of stay, and readmission metrics.
                </p>
              </div>

              <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-200">
                  <UsersIcon className="h-4 w-4 text-brand-300" />
                  <span>Healthcare Researcher</span>
                </div>
                <p className="text-[11px] text-brand-100/70 mt-0.5">
                  Anonymized cohort outcomes & medication analytics.
                </p>
              </div>

              <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-200">
                  <ShieldAlertIcon className="h-4 w-4 text-brand-300" />
                  <span>System Administrator</span>
                </div>
                <p className="text-[11px] text-brand-100/70 mt-0.5">
                  User permissions, audit trails & ML model lifecycle.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-brand-200/70 flex items-center justify-between">
            <span>Verified Practitioner Access</span>
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Create Practitioner Account
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provide your professional credentials to establish role-based access.
            </p>
          </div>

          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
