import React from 'react';
import { ContributingFactor } from '@/features/predictions/prediction.types';
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles } from 'lucide-react';

interface PredictionFactorsProps {
  factors: ContributingFactor[];
}

export const PredictionFactors: React.FC<PredictionFactorsProps> = ({ factors }) => {
  if (!factors || factors.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
        No significant contributing risk factors recorded.
      </div>
    );
  }

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'HIGH':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            High Impact
          </span>
        );
      case 'MODERATE':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Moderate
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Baseline
          </span>
        );
    }
  };

  const getDirectionIcon = (dir: string) => {
    switch (dir) {
      case 'INCREASES_RISK':
        return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
      case 'DECREASES_RISK':
        return <ArrowDownRight className="w-4 h-4 text-emerald-500" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-teal-500" />
        Clinical Risk Drivers & Contributing Factors
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {factors.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                {getDirectionIcon(item.direction)}
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {item.factor}
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.detail}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">{getImpactBadge(item.impact)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
