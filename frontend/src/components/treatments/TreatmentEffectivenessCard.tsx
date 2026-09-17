import React from 'react';
import { Award, CheckCircle2, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatPercentage, formatScore } from '@/features/analytics/analytics.utils';
import { getEffectivenessTier } from '@/features/treatments/treatment.utils';

interface TreatmentEffectivenessCardProps {
  score?: number | null;
  totalTreatments: number;
  completedTreatments: number;
  completionRate?: number | null;
}

export const TreatmentEffectivenessCard: React.FC<TreatmentEffectivenessCardProps> = ({
  score,
  totalTreatments,
  completedTreatments,
  completionRate,
}) => {
  const tier = getEffectivenessTier(score);

  return (
    <Card className="p-5 border space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Effectiveness Evaluation
        </span>
        <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400">
          <Award className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black text-slate-900 dark:text-slate-50">
          {formatScore(score)}
        </span>
        <span className="text-xs font-semibold text-slate-400">/ 100</span>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> Completion Rate
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {completionRate !== undefined && completionRate !== null
              ? formatPercentage(completionRate)
              : totalTreatments > 0
              ? `${Math.round((completedTreatments / totalTreatments) * 100)}%`
              : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Completed
          </span>
          <span className="font-medium text-slate-600 dark:text-slate-400">
            {completedTreatments} of {totalTreatments} treatments
          </span>
        </div>
        <div className="pt-1">
          <span className={`text-xs font-bold ${tier.color}`}>
            {tier.label}
          </span>
        </div>
      </div>
    </Card>
  );
};
