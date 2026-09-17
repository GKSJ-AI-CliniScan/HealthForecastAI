import React, { useState } from 'react';
import {
  Activity,
  Clock,
  Building2,
  TrendingUp,
  Download,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';
import { ClinicalDisclaimer } from '@/components/common/ClinicalDisclaimer';
import { PatientOutcomeChart } from '@/components/analytics/PatientOutcomeChart';
import { RecoveryTrendChart } from '@/components/analytics/RecoveryTrendChart';
import {
  usePatientOutcomeAnalytics,
  useHospitalPerformance,
  useExportOutcomes,
} from '@/features/analytics/analytics.hooks';
import { formatPercentage } from '@/features/analytics/analytics.utils';

export const RecoveryAnalysis: React.FC = () => {
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const { data: outcomesData, isLoading: outcomesLoading, isError: outcomesError, refetch } =
    usePatientOutcomeAnalytics();
  const { data: hospitalData, isLoading: hospLoading } = useHospitalPerformance();
  const exportMutation = useExportOutcomes();

  const handleExport = async () => {
    setExportMessage('Preparing report...');
    try {
      await exportMutation.mutateAsync();
      setExportMessage('Report exported successfully.');
      setTimeout(() => setExportMessage(null), 3000);
    } catch {
      setExportMessage('Failed to export outcomes report.');
      setTimeout(() => setExportMessage(null), 3000);
    }
  };

  if (outcomesLoading || hospLoading) return <LoadingSkeleton rows={4} />;
  if (outcomesError || !outcomesData) {
    return <ErrorAlert message="Unable to load recovery analysis metrics." onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Patient Recovery & Outcome Analysis"
          subtitle="Inpatient recovery progression, post-discharge outcome trajectory, and stay duration analytics."
        />
        <div className="flex items-center gap-3">
          {exportMessage && (
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800">
              {exportMessage}
            </span>
          )}
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-teal-600" />
            {exportMutation.isPending ? 'Preparing report...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <ClinicalDisclaimer />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Evaluations Recorded</span>
            <Activity className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {outcomesData.total_outcomes_recorded.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">Total recovery progress assessments</p>
        </Card>

        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Mean Length of Stay</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {hospitalData ? `${hospitalData.average_length_of_stay.toFixed(1)} days` : 'N/A'}
          </div>
          <p className="text-xs text-slate-400">Hospital inpatient recovery period</p>
        </Card>

        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Improvement Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {formatPercentage(outcomesData.improvement_rate_pct)}
          </div>
          <p className="text-xs text-slate-400">Cases reaching recovered or stable state</p>
        </Card>

        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Admissions Tracked</span>
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {hospitalData ? hospitalData.total_admissions.toLocaleString() : 'N/A'}
          </div>
          <p className="text-xs text-slate-400">Hospitalization episodes evaluated</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PatientOutcomeChart outcomeDistribution={outcomesData.outcome_distribution} />
        <RecoveryTrendChart data={outcomesData.outcome_trends} />
      </div>
    </div>
  );
};
