import React from 'react';
import { TreatmentInfo } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StethoscopeIcon, CheckCircleIcon } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Badge';

export interface TreatmentSectionProps {
  treatment: TreatmentInfo;
}

export function TreatmentSection({ treatment }: TreatmentSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
            <StethoscopeIcon className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Treatment Information & Current Medications</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 text-xs">
        {/* Active Medications */}
        <div>
          <h4 className="text-xs font-bold text-warm-text dark:text-warm-text mb-2.5">
            Active Pharmacotherapy & Prescriptions
          </h4>
          <div className="overflow-x-auto rounded-lg border border-warm-border dark:border-warm-border">
            <table className="w-full text-left">
              <thead className="bg-warm-neutral/30 text-[11px] font-semibold text-warm-text-muted dark:bg-warm-neutral/10 dark:text-warm-text-muted border-b border-warm-border/60 dark:border-warm-border/60">
                <tr>
                  <th className="py-2.5 px-3">Medication Name</th>
                  <th className="py-2.5 px-3">Dosage</th>
                  <th className="py-2.5 px-3">Frequency & Route</th>
                  <th className="py-2.5 px-3">Prescribed Date</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border/40 dark:divide-warm-border/40 text-xs">
                {treatment.current_medications.map((med, i) => (
                  <tr key={i} className="hover:bg-warm-bg/50 dark:hover:bg-warm-neutral/10">
                    <td className="py-2.5 px-3 font-semibold text-warm-text dark:text-warm-text">
                      {med.name}
                    </td>
                    <td className="py-2.5 px-3 text-warm-text dark:text-warm-text">{med.dosage}</td>
                    <td className="py-2.5 px-3 text-warm-text-muted dark:text-warm-text-muted">
                      {med.frequency} ({med.route})
                    </td>
                    <td className="py-2.5 px-3 text-warm-text-muted dark:text-warm-text-muted">
                      {med.prescribed_date}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage-50 text-sage-700 border border-sage-200 dark:bg-sage-900/50 dark:text-sage-200 dark:border-sage-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Laboratory Diagnostic Results */}
        {treatment.lab_results && treatment.lab_results.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-warm-text dark:text-warm-text mb-2.5">
              Diagnostic & Glycemic Lab Panels
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {treatment.lab_results.map((lab, i) => {
                const isCritical = lab.status === 'critical';
                const isAbnormal = lab.status === 'abnormal';

                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-3 flex items-center justify-between ${
                      isCritical
                        ? 'border-coral-200 bg-coral-50/50 dark:border-coral-900/40 dark:bg-coral-950/20'
                        : isAbnormal
                        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
                        : 'border-warm-border bg-white dark:border-warm-border dark:bg-warm-card'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] text-warm-text-muted dark:text-warm-text-muted block">
                        {lab.test_name} ({lab.date})
                      </span>
                      <span
                        className={`text-sm font-bold mt-0.5 block ${
                          isCritical
                            ? 'text-coral-700 dark:text-coral-300'
                            : isAbnormal
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-warm-text dark:text-warm-text'
                        }`}
                      >
                        {lab.value}
                      </span>
                      <span className="text-[10px] text-warm-text-light">Ref: {lab.reference_range}</span>
                    </div>

                    <div>
                      {isCritical ? (
                        <Badge variant="danger" className="text-[10px] py-0 px-2">
                          Critical
                        </Badge>
                      ) : isAbnormal ? (
                        <Badge variant="warning" className="text-[10px] py-0 px-2">
                          Abnormal
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px] py-0 px-2">
                          Normal
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clinical Care Plan & Follow-up */}
        <div className="rounded-xl border border-warm-border/80 bg-warm-neutral/30 p-4 dark:border-warm-border dark:bg-warm-neutral/10 space-y-3">
          <div>
            <h5 className="font-bold text-warm-text dark:text-warm-text">
              Clinical Care Pathway & Protocols
            </h5>
            <ul className="mt-2 space-y-1.5 text-warm-text dark:text-warm-text">
              {treatment.care_plan.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-brand-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {treatment.follow_up_instructions && (
            <div className="pt-2.5 border-t border-warm-border/60 dark:border-warm-border/60">
              <span className="font-bold text-warm-text dark:text-warm-text">
                Discharge & Follow-Up Instructions:
              </span>
              <p className="mt-1 text-warm-text-muted dark:text-warm-text-muted leading-relaxed">
                {treatment.follow_up_instructions}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
