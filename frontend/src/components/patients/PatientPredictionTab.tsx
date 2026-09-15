import React from 'react';
import {
  usePatientPredictions,
  useGeneratePrediction,
} from '@/features/predictions/prediction.hooks';
import { PredictionCard } from '@/components/predictions/PredictionCard';
import { PredictionDisclaimer } from '@/components/predictions/PredictionDisclaimer';
import { PredictionHistoryTable } from '@/components/predictions/PredictionHistoryTable';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { Activity, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface PatientPredictionTabProps {
  patientId: string;
}

export const PatientPredictionTab: React.FC<PatientPredictionTabProps> = ({ patientId }) => {
  const { user } = useAuth();
  const isResearcher = user?.role === 'RESEARCHER';
  const canPredict = user?.role === 'DOCTOR' || user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SYSTEM_ADMIN';

  const {
    data: predictions = [],
    isLoading,
    isError,
    refetch,
  } = usePatientPredictions(patientId);

  const generateMutation = useGeneratePrediction(patientId);

  const latestPrediction = predictions.length > 0 ? predictions[0] : null;

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync({ patient_id: patientId });
    } catch (err) {
      console.error('Failed to generate prediction:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 space-y-3">
        <Activity className="w-6 h-6 animate-spin mx-auto text-teal-500" />
        <p>Loading patient clinical risk intelligence...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>Unable to retrieve risk predictions for this patient.</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-transparent border border-teal-500/20">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            AI Readmission Risk Assessment
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Predictive intelligence identifying 30-day hospital readmission probabilities.
          </p>
        </div>

        {canPredict && !isResearcher && (
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            icon={generateMutation.isPending ? RefreshCw : Sparkles}
            className={generateMutation.isPending ? 'animate-pulse' : ''}
          >
            {generateMutation.isPending ? 'Generating prediction...' : 'Generate Readmission Prediction'}
          </Button>
        )}
      </div>

      {generateMutation.isError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
          Unable to generate prediction. Please ensure clinical record contains valid history and try again.
        </div>
      )}

      {/* Latest Prediction Card */}
      {latestPrediction ? (
        <div className="space-y-6">
          <PredictionCard prediction={latestPrediction} />

          {/* Previous Prediction Timeline */}
          {predictions.length > 1 && (
            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Evaluation History Timeline ({predictions.length - 1} prior assessments)
              </h4>
              <PredictionHistoryTable predictions={predictions.slice(1)} />
            </div>
          )}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-inner">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No predictions available
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              This patient has not yet undergone AI readmission risk scoring. Click below to evaluate their electronic health record against the model.
            </p>
          </div>
          {canPredict && !isResearcher && (
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              icon={Sparkles}
            >
              {generateMutation.isPending ? 'Generating prediction...' : 'Evaluate Readmission Risk'}
            </Button>
          )}
          <div className="pt-4 max-w-lg mx-auto">
            <PredictionDisclaimer compact />
          </div>
        </Card>
      )}
    </div>
  );
};
