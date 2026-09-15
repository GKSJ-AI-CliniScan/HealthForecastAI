import React from 'react';
import { HighRiskPatient } from '@/features/predictions/prediction.types';
import { RiskBadge } from './RiskBadge';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { User, Eye, RefreshCw, AlertTriangle, AlertOctagon } from 'lucide-react';

interface HighRiskPatientTableProps {
  patients: HighRiskPatient[];
  isLoading?: boolean;
  onGeneratePrediction?: (patientId: string) => void;
  isGenerating?: boolean;
}

export const HighRiskPatientTable: React.FC<HighRiskPatientTableProps> = ({
  patients,
  isLoading = false,
  onGeneratePrediction,
  isGenerating = false,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
        Loading high-risk clinical watchlist...
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
        No patients currently classified as High or Critical readmission risk.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <th className="py-3.5 px-4">Patient</th>
            <th className="py-3.5 px-4">Severity Band</th>
            <th className="py-3.5 px-4">Risk Score</th>
            <th className="py-3.5 px-4">Probability</th>
            <th className="py-3.5 px-4">Assigned Doctor</th>
            <th className="py-3.5 px-4">Last Evaluated</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {patients.map((pat) => {
            const isCrit = pat.risk_category === 'CRITICAL';
            const dateStr = new Date(pat.latest_prediction_date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <tr
                key={pat.patient_id}
                className={`transition-colors ${
                  isCrit
                    ? 'bg-rose-50/40 dark:bg-rose-950/15 hover:bg-rose-50/70 dark:hover:bg-rose-950/25'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }`}
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    {isCrit ? (
                      <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {pat.patient_name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {pat.patient_identifier}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <RiskBadge category={pat.risk_category} size="sm" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-sm font-extrabold font-mono ${
                        isCrit ? 'text-rose-600 dark:text-rose-400' : 'text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      {pat.risk_score}
                    </span>
                    <span className="text-[10px] text-slate-400">/ 100</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(pat.readmission_probability * 100)}%
                </td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                  {pat.assigned_doctor_name || (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{dateStr}</td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/patients/${pat.patient_id}`)}
                      icon={User}
                    >
                      Patient
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/predictions/${pat.prediction_id}`)}
                      icon={Eye}
                    >
                      Prediction
                    </Button>
                    {onGeneratePrediction && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onGeneratePrediction(pat.patient_id)}
                        disabled={isGenerating}
                        icon={RefreshCw}
                        title="Re-run readmission prediction"
                      >
                        Re-evaluate
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
