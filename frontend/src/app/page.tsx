import React from 'react';
import { MODULES } from '@/lib/modules';
import { AppShell } from '@/components/layout/AppShell';

export default function Home() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl py-4 sm:py-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Predictive Healthcare Intelligence
        </p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          HealthForecast AI
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Hospital readmission prediction and patient risk intelligence.
        </p>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Platform Modules
          </h2>
          <ul className="mt-4 grid gap-3.5 sm:grid-cols-2">
            {MODULES.map((module) => (
              <li
                key={module.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Module {module.id}
                </span>
                <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {module.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {module.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
