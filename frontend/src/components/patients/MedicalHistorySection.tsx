import React from 'react';
import { MedicalHistory } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ActivityIcon, AlertCircleIcon } from '@/components/ui/Icons';

export interface MedicalHistorySectionProps {
  medicalHistory: MedicalHistory;
}

export function MedicalHistorySection({ medicalHistory }: MedicalHistorySectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
            <ActivityIcon className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Medical History & Clinical Diagnoses</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-xs">
        {/* Primary & Secondary Diagnoses */}
        <div className="rounded-xl border border-warm-border/80 bg-warm-neutral/30 p-4 dark:border-warm-border dark:bg-warm-neutral/10">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-text-light">
            Primary Clinical Diagnosis
          </span>
          <p className="mt-1 text-sm font-bold text-warm-text dark:text-warm-text">
            {medicalHistory.primary_diagnosis}
          </p>

          {medicalHistory.secondary_diagnoses && medicalHistory.secondary_diagnoses.length > 0 && (
            <div className="mt-3 pt-3 border-t border-warm-border/60 dark:border-warm-border/60">
              <span className="text-[11px] font-semibold text-warm-text-muted dark:text-warm-text-muted">
                Comorbidities & Secondary Diagnoses:
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {medicalHistory.secondary_diagnoses.map((diag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md bg-white px-2.5 py-1 text-xs font-medium text-warm-text border border-warm-border dark:bg-warm-card dark:text-warm-text dark:border-warm-border"
                  >
                    {diag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chronic Conditions & Allergies */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Chronic Conditions */}
          <div className="rounded-xl border border-warm-border bg-white p-4 dark:border-warm-border dark:bg-warm-card">
            <h4 className="text-xs font-bold text-warm-text dark:text-warm-text flex items-center gap-1.5">
              <span>Chronic Conditions</span>
            </h4>
            <ul className="mt-2 space-y-1.5 text-warm-text dark:text-warm-text">
              {medicalHistory.chronic_conditions.map((cond, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span>{cond}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Allergies & Drug Sensitivities */}
          <div className="rounded-xl border border-coral-200 bg-coral-50/50 p-4 dark:border-coral-900/40 dark:bg-coral-950/20">
            <h4 className="text-xs font-bold text-coral-900 dark:text-coral-200 flex items-center gap-1.5">
              <AlertCircleIcon className="h-4 w-4 text-coral-600 dark:text-coral-400" />
              <span>Known Allergies & Contraindications</span>
            </h4>
            <ul className="mt-2 space-y-1.5 text-coral-800 dark:text-coral-300">
              {medicalHistory.allergies.map((allergy, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
                  <span className="font-semibold">{allergy}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Health Metrics (Smoking, BMI, Past Surgeries) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-lg bg-warm-neutral/30 p-3 dark:bg-warm-neutral/10 border border-warm-border/60 dark:border-warm-border/60">
            <span className="text-warm-text-muted font-medium">Body Mass Index (BMI)</span>
            <p className="mt-1 font-bold text-warm-text dark:text-warm-text text-sm">
              {medicalHistory.bmi} kg/m²
            </p>
          </div>

          <div className="rounded-lg bg-warm-neutral/30 p-3 dark:bg-warm-neutral/10 border border-warm-border/60 dark:border-warm-border/60">
            <span className="text-warm-text-muted font-medium">Smoking History</span>
            <p className="mt-1 font-bold text-warm-text dark:text-warm-text text-sm">
              {medicalHistory.smoking_status}
            </p>
          </div>

          <div className="rounded-lg bg-warm-neutral/30 p-3 dark:bg-warm-neutral/10 border border-warm-border/60 dark:border-warm-border/60">
            <span className="text-warm-text-muted font-medium">Surgical History</span>
            <p className="mt-1 font-semibold text-warm-text dark:text-warm-text truncate" title={medicalHistory.past_surgeries.join(', ')}>
              {medicalHistory.past_surgeries.length > 0
                ? medicalHistory.past_surgeries.join(', ')
                : 'No prior surgeries'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
