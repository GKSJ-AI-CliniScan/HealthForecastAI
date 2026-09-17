import React from 'react';
import { Calendar, CheckCircle, Clock, Stethoscope } from 'lucide-react';
import { PatientTreatmentItem } from '@/features/treatments/treatment.types';
import { TreatmentOutcomeBadge } from './TreatmentOutcomeBadge';

interface TreatmentTimelineProps {
  treatments: PatientTreatmentItem[];
}

export const TreatmentTimeline: React.FC<TreatmentTimelineProps> = ({ treatments }) => {
  if (!treatments || treatments.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        No treatment records found for this patient.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {treatments.map((tx) => {
        const isCompleted = tx.status === 'COMPLETED';
        return (
          <div key={tx.id} className="relative group">
            {/* Timeline icon dot */}
            <div
              className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] bg-white dark:bg-slate-900 transition-colors ${
                isCompleted
                  ? 'border-teal-500 text-teal-600'
                  : 'border-blue-500 text-blue-600'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
            </div>

            {/* Content card */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-teal-500" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {tx.treatment_name}
                  </span>
                  {tx.treatment_type && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                      {tx.treatment_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TreatmentOutcomeBadge outcome={tx.outcome} />
                  {tx.effectiveness_score !== null && tx.effectiveness_score !== undefined && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Score: {Math.round(tx.effectiveness_score)}/100
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Started: {tx.start_date}
                </span>
                {tx.end_date && (
                  <span>Ended: {tx.end_date}</span>
                )}
                {tx.duration_days !== null && tx.duration_days !== undefined && (
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    Duration: {tx.duration_days} days
                  </span>
                )}
              </div>

              {tx.notes && (
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {tx.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
