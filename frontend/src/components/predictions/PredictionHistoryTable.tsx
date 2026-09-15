import React from 'react';
import { Prediction } from '@/features/predictions/prediction.types';
import { RiskBadge } from './RiskBadge';
import { Button } from '@/components/ui/Button';
import { Eye } from 'lucide-react';

interface PredictionHistoryTableProps {
  predictions: Prediction[];
  isLoading?: boolean;
  onSelectPrediction?: (prediction: Prediction) => void;
}

export const PredictionHistoryTable: React.FC<PredictionHistoryTableProps> = ({
  predictions,
  isLoading = false,
  onSelectPrediction,
}) => {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading prediction history records...
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
        No predictions recorded matching current criteria.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <th className="py-3.5 px-4">Date</th>
            <th className="py-3.5 px-4">Patient</th>
            <th className="py-3.5 px-4">Risk Score</th>
            <th className="py-3.5 px-4">Risk Category</th>
            <th className="py-3.5 px-4">Readmission Prob</th>
            <th className="py-3.5 px-4">Model</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {predictions.map((item) => {
            const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <tr
                key={item.id}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{dateStr}</td>
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {item.patient_name || 'Inpatient'}
                  </div>
                  {item.patient_identifier && (
                    <div className="text-[10px] font-mono text-slate-400">
                      {item.patient_identifier}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                  {item.risk_score} / 100
                </td>
                <td className="py-3.5 px-4">
                  <RiskBadge category={item.risk_category} size="sm" />
                </td>
                <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                  {Math.round(item.readmission_probability * 100)}%
                </td>
                <td className="py-3.5 px-4 text-slate-500">
                  <span className="font-semibold">{item.model_name}</span>{' '}
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.model_version}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  {onSelectPrediction && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectPrediction(item)}
                      icon={Eye}
                    >
                      View
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
