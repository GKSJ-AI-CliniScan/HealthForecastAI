import React from 'react';
import Link from 'next/link';
import { MODULES } from '@/lib/modules';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import {
  PulseIcon,
  ArrowRightIcon,
  UsersIcon,
  LockIcon,
} from '@/components/ui/Icons';

export default function Home() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl py-4 sm:py-6 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-warm-text p-8 text-white shadow-xl">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-brand-300/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-brand-200 backdrop-blur-sm border border-white/20">
              <PulseIcon className="h-3.5 w-3.5 text-brand-300 animate-pulse" />
              <span>Milestone 1 Clinical Platform</span>
            </div>

            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              HealthForecast <span className="text-brand-300">AI</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-brand-100/90 leading-relaxed">
              Hospital readmission prediction and patient risk intelligence system designed for doctors, administrators, and clinical researchers.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <Button
                  variant="primary"
                  size="md"
                  rightIcon={<ArrowRightIcon className="h-4 w-4" />}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-lg shadow-brand-900/20"
                >
                  Launch Clinical Dashboard
                </Button>
              </Link>
              <Link href="/patients">
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<UsersIcon className="h-4 w-4" />}
                  className="border-white/25 text-white hover:bg-white/15 dark:border-white/25 dark:text-white"
                >
                  Patient Management Registry
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="md"
                  leftIcon={<LockIcon className="h-4 w-4" />}
                  className="text-brand-200 hover:text-white hover:bg-white/15"
                >
                  Practitioner Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Platform Modules Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-warm-text dark:text-warm-text">
                Platform Architecture & Modules
              </h2>
              <p className="text-xs text-warm-text-muted dark:text-warm-text-muted">
                Core system capabilities spanning clinical risk intelligence, RBAC governance, and analytics.
              </p>
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((module) => (
              <div
                key={module.id}
                className="rounded-xl border border-warm-border bg-white p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md dark:border-warm-border dark:bg-warm-card dark:hover:border-warm-border"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded">
                    Module {module.id}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-warm-text dark:text-warm-text">
                  {module.name}
                </h3>
                <p className="mt-1.5 text-xs text-warm-text-muted dark:text-warm-text-muted leading-relaxed">
                  {module.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
