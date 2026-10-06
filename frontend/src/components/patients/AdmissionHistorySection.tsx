import React from 'react';
import { Admission } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ClockIcon } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';

export interface AdmissionHistorySectionProps {
  admissions: Admission[];
}

export function AdmissionHistorySection({ admissions }: AdmissionHistorySectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
              <ClockIcon className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">Hospital Admission & Encounter Timeline</CardTitle>
          </div>
          <span className="text-xs text-warm-text-muted dark:text-warm-text-muted">
            {admissions.length} Total Encounter{admissions.length === 1 ? '' : 's'}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {admissions.length === 0 ? (
          <p className="text-xs text-warm-text-muted dark:text-warm-text-muted">
            No previous hospital encounters recorded.
          </p>
        ) : (
          <div className="space-y-4">
            {admissions.map((admission, idx) => (
              <div
                key={admission.id}
                className="relative rounded-xl border border-warm-border bg-white p-4 shadow-sm dark:border-warm-border dark:bg-warm-card transition-all hover:border-brand-300 dark:hover:border-warm-border"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-border/60 pb-3 dark:border-warm-border/60">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warm-neutral text-xs font-bold text-warm-text dark:bg-warm-neutral/20 dark:text-warm-text">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-warm-text dark:text-warm-text">
                      Encounter ID #{admission.id}
                    </span>
                    <span className="text-warm-border dark:text-warm-border">&bull;</span>
                    <span className="text-xs text-warm-text-muted dark:text-warm-text-muted">
                      {admission.admission_type} Admission
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {admission.readmitted_within_30 ? (
                      <Badge variant="riskHigh">
                        Readmitted &lt; 30 Days
                      </Badge>
                    ) : admission.readmitted === '>30' ? (
                      <Badge variant="riskMedium">
                        Readmitted &gt; 30 Days
                      </Badge>
                    ) : (
                      <Badge variant="success">
                        No 30-Day Readmission
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-warm-text-light">Admission Date</span>
                    <p className="font-semibold text-warm-text dark:text-warm-text mt-0.5">
                      {admission.admission_date}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-warm-text-light">Discharge Date</span>
                    <p className="font-semibold text-warm-text dark:text-warm-text mt-0.5">
                      {admission.discharge_date || 'Currently Inpatient'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-warm-text-light">Length of Stay</span>
                    <p className="font-semibold text-warm-text dark:text-warm-text mt-0.5">
                      {admission.time_in_hospital} Day{admission.time_in_hospital === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-warm-text-light">Medications Administered</span>
                    <p className="font-semibold text-warm-text dark:text-warm-text mt-0.5">
                      {admission.num_medications} Prescribed
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-warm-border/60 dark:border-warm-border/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-warm-text-muted dark:text-warm-text-muted gap-1">
                  <div>
                    <span className="font-medium text-warm-text dark:text-warm-text">Disposition: </span>
                    <span>{admission.discharge_disposition}</span>
                  </div>
                  {admission.attending_physician && (
                    <div>
                      <span className="font-medium text-warm-text dark:text-warm-text">Physician: </span>
                      <span>{admission.attending_physician}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
