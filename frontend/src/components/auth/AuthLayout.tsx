import React from 'react';
import Link from 'next/link';
import {
  PulseIcon,
  StethoscopeIcon,
  BarChartIcon,
  UsersIcon,
  ShieldAlertIcon,
  ArrowLeftIcon,
} from '@/components/ui/Icons';

export interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  badgeText?: string;
  heroHeadline?: string;
  heroDescription?: string;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  badgeText = 'Clinical Access Portal',
  heroHeadline = 'Hospital Readmission Prediction & Patient Risk Intelligence',
  heroDescription = 'AI-powered clinical risk stratification, bed utilization analytics, and longitudinal cohort intelligence for verified healthcare professionals.',
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-warm-bg dark:bg-warm-bg flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative selection:bg-brand-500 selection:text-white">
      {/* Return to Platform Link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-warm-text-muted hover:text-brand-600 dark:text-warm-text-muted dark:hover:text-brand-400 transition-colors"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          <span>Back to Platform</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden border border-warm-border bg-white shadow-xl dark:border-warm-border dark:bg-warm-card mt-6 sm:mt-0">
        {/* Left Side: Healthcare Brand Hero Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-brand-900 via-brand-800 to-warm-text p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-brand-300/15 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm shadow-inner">
                <PulseIcon className="h-6 w-6 text-brand-300 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">HealthForecast AI</h2>
                <p className="text-[10px] text-brand-200/90 font-semibold uppercase tracking-wider">
                  {badgeText}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-bold tracking-tight leading-snug">
                {heroHeadline}
              </h3>
              <p className="text-xs text-brand-100/80 leading-relaxed">
                {heroDescription}
              </p>
            </div>

            {/* Role Capabilities Quick Cards */}
            <div className="mt-6 space-y-2">
              <div className="rounded-lg bg-white/10 p-2.5 border border-white/15 flex items-start gap-2.5">
                <StethoscopeIcon className="h-4 w-4 text-brand-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-brand-200">Doctor</div>
                  <div className="text-[11px] text-brand-100/75">Readmission prognosis & patient alerts.</div>
                </div>
              </div>

              <div className="rounded-lg bg-white/10 p-2.5 border border-white/15 flex items-start gap-2.5">
                <BarChartIcon className="h-4 w-4 text-brand-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-brand-200">Hospital Admin</div>
                  <div className="text-[11px] text-brand-100/75">Bed capacity & readmission rates.</div>
                </div>
              </div>

              <div className="rounded-lg bg-white/10 p-2.5 border border-white/15 flex items-start gap-2.5">
                <UsersIcon className="h-4 w-4 text-brand-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-brand-200">Healthcare Researcher</div>
                  <div className="text-[11px] text-brand-100/75">De-identified cohorts & treatment outcomes.</div>
                </div>
              </div>

              <div className="rounded-lg bg-white/10 p-2.5 border border-white/15 flex items-start gap-2.5">
                <ShieldAlertIcon className="h-4 w-4 text-brand-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-brand-200">System Admin</div>
                  <div className="text-[11px] text-brand-100/75">RBAC governance & ML model audits.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15 text-[11px] text-brand-200/80 flex items-center justify-between">
            <span>Clinical Data Protocol</span>
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* Right Side: Form Content Panel */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-warm-text dark:text-warm-text">
              {title}
            </h1>
            <p className="mt-1 text-xs text-warm-text-muted dark:text-warm-text-muted">
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
