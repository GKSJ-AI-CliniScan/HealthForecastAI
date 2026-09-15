import React from 'react';
import { Prediction } from '@/features/predictions/prediction.types';
import { RiskScoreGauge } from './RiskScoreGauge';
import { PredictionFactors } from './PredictionFactors';
import { PredictionDisclaimer } from './PredictionDisclaimer';
import { Card } from '@/components/ui/Card';
import { Cpu, Calendar, Lightbulb } from 'lucide-react';

interface PredictionCardProps {
  prediction: Prediction;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const formattedDate = new Date(prediction.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {prediction.patient_name || 'Inpatient Assessment'}
            </h3>
            {prediction.patient_identifier && (
              <span className="text-xs font-mono text-slate-400">
                ({prediction.patient_identifier})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-teal-500" />
              {prediction.model_name} {prediction.model_version}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Model Confidence</span>
            <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400">
              {Math.round(prediction.confidence_score * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Gauge */}
        <div className="lg:col-span-4 flex justify-center border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800/80 pb-6 lg:pb-0">
          <RiskScoreGauge
            score={prediction.risk_score}
            category={prediction.risk_category}
            probability={prediction.readmission_probability}
          />
        </div>

        {/* Factors */}
        <div className="lg:col-span-8">
          <PredictionFactors factors={prediction.contributing_factors} />
        </div>
      </div>

      {/* Clinical Decision-Support Insights */}
      {prediction.clinical_insights && (
        <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/40 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-800 dark:text-teal-300">
            <Lightbulb className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            Decision-Support Guidance
          </div>
          <p className="text-xs text-teal-900/90 dark:text-teal-200/90 leading-relaxed">
            {prediction.clinical_insights}
          </p>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <PredictionDisclaimer compact />
    </Card>
  );
};
