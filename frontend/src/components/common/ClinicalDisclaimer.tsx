import React from 'react';
import { Shield } from 'lucide-react';

interface ClinicalDisclaimerProps {
  className?: string;
}

export const ClinicalDisclaimer: React.FC<ClinicalDisclaimerProps> = ({ className = '' }) => {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border border-teal-500/20 bg-teal-50/50 dark:bg-teal-950/20 text-slate-700 dark:text-slate-300 text-xs shadow-sm ${className}`}
    >
      <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <span className="font-bold text-slate-900 dark:text-slate-100">
          Clinical Decision-Support Notice
        </span>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          Analytics are provided for informational and decision-support purposes and should be reviewed by qualified healthcare professionals.
        </p>
      </div>
    </div>
  );
};
