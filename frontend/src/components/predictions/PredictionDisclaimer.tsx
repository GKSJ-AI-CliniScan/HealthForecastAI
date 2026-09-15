import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { HEALTHCARE_DISCLAIMER_TEXT } from '@/features/predictions/prediction.utils';

interface PredictionDisclaimerProps {
  compact?: boolean;
}

export const PredictionDisclaimer: React.FC<PredictionDisclaimerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-200">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="font-medium">{HEALTHCARE_DISCLAIMER_TEXT}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-amber-900 dark:text-amber-200 shadow-sm">
      <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
        <ShieldAlert className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          Clinical Decision Support Notice
        </h4>
        <p className="text-xs mt-1 text-amber-700/90 dark:text-amber-300/90 font-medium leading-relaxed">
          {HEALTHCARE_DISCLAIMER_TEXT}
        </p>
      </div>
    </div>
  );
};
