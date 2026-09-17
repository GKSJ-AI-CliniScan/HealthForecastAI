import React, { useState } from 'react';
import {
  Pill,
  CheckCircle,
  Clock,
  Award,
  Search,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';
import { ClinicalDisclaimer } from '@/components/common/ClinicalDisclaimer';
import { MedicationEffectivenessChart } from '@/components/analytics/MedicationEffectivenessChart';
import { TreatmentOutcomeChart } from '@/components/analytics/TreatmentOutcomeChart';
import { useMedicationAnalytics } from '@/features/analytics/analytics.hooks';
import { formatScore } from '@/features/analytics/analytics.utils';

export const MedicationEffectiveness: React.FC = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useMedicationAnalytics();

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (isError || !data) return <ErrorAlert message="Unable to load medication analytics." onRetry={refetch} />;

  const filtered = data.medication_breakdown.filter((m) =>
    m.medication_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medication Outcome & Effectiveness Analytics"
        subtitle="Monitoring pharmacotherapy outcomes, patient response scores, and regimen status across hospital cohorts."
      />

      <ClinicalDisclaimer />

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Prescriptions</span>
            <Pill className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {data.total_medications.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">Total hospital medication records</p>
        </Card>

        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Active Therapies</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {data.active_medications.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">Current ongoing medication courses</p>
        </Card>

        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Completed Courses</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {data.completed_medications.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">Fully administered drug regimens</p>
        </Card>

        <Card className="p-5 border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Mean Effectiveness</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-50">
            {formatScore(data.average_effectiveness)}
          </div>
          <p className="text-xs text-slate-400">Average therapeutic response score</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TreatmentOutcomeChart
          outcomeDistribution={data.outcome_distribution}
          title="Medication Outcome Distribution"
          subtitle="Proportion of patient responses by therapeutic outcome classification"
        />
        <MedicationEffectivenessChart data={data.medication_breakdown} />
      </div>

      {/* Breakdown Table */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pharmacotherapy Cohort Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Patient volume, therapy status, and therapeutic scores grouped by pharmaceutical agent
            </p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search medication..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Medication Name</th>
                <th className="py-3 px-4">Patients Prescribed</th>
                <th className="py-3 px-4">Active Courses</th>
                <th className="py-3 px-4">Completed Courses</th>
                <th className="py-3 px-4">Average Effectiveness</th>
                <th className="py-3 px-4">Outcome Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No medications found matching search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.medication_name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Pill className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      {m.medication_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {m.total_patients}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {m.active_count}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {m.completed_count}
                    </td>
                    <td className="py-3.5 px-4">
                      {m.avg_effectiveness !== null && m.avg_effectiveness !== undefined ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {Math.round(m.avg_effectiveness)} / 100
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending scores</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(m.outcome_distribution).map(([status, cnt]) => (
                          <span
                            key={status}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {status}: {cnt}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
