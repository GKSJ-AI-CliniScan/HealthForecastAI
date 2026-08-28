import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { PulseIcon, ShieldAlertIcon, HeartPulseIcon, BarChartIcon } from '@/components/ui/Icons';

export const metadata: Metadata = {
  title: 'Sign In | HealthForecast AI',
  description: 'Secure healthcare portal for readmission risk intelligence and patient management.',
};

export default function LoginPage() {
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
        {/* Left Side: Healthcare Intelligence Brand Panel */}
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
                  Clinical Intelligence
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-bold tracking-tight leading-snug">
                Predictive Risk Analytics for Clinical Care Teams
              </h3>
              <p className="text-xs text-brand-100/80 leading-relaxed">
                Empowering healthcare providers with early readmission prediction, patient risk
                stratification, and treatment outcome intelligence.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5 backdrop-blur-sm border border-white/10 text-xs">
                <ShieldAlertIcon className="h-4 w-4 text-brand-300 shrink-0" />
                <span>30-Day Readmission Risk Scoring</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5 backdrop-blur-sm border border-white/10 text-xs">
                <HeartPulseIcon className="h-4 w-4 text-brand-300 shrink-0" />
                <span>Clinical Decision & Treatment Support</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5 backdrop-blur-sm border border-white/10 text-xs">
                <BarChartIcon className="h-4 w-4 text-brand-300 shrink-0" />
                <span>Hospital Resource & Bed Analytics</span>
              </div>
            </div>
          </div>

          {/* Security & Compliance Footer */}
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-brand-200/70">
            <span>HIPAA Compliant Protocol</span>
            <span>Role-Based Access</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign In to Your Account
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Enter your authorized hospital email address and password to continue.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
