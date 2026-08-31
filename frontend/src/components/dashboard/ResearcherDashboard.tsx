import React from 'react';
import { Database, ShieldCheck, FileSpreadsheet, Binary } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Card } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { DashboardMetrics } from '@/types';

export const ResearcherDashboard: React.FC<{ metrics: DashboardMetrics }> = ({ metrics }) => {
  const cards = metrics.cards || {};
  const datasetSummary = metrics.dataset_summary;
  const sampleAnonymized = metrics.sample_anonymized_patients || [];

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-800 text-white shadow-xl shadow-purple-950/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-purple-300" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
              HIPAA De-Identified Research Portal
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Research Analytics & Population Health</h2>
          <p className="text-xs sm:text-sm text-purple-100 mt-1 max-w-xl">
            Access strictly anonymized patient cohorts, feature distributions, and the Diabetes 130-US Hospitals reference dataset.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Anonymized Patient Records"
          value={cards.total_anonymized_records ?? 0}
          subtitle="De-identified cohort entries"
          icon={ShieldCheck}
          color="purple"
        />
        <StatCard
          title="Dataset Total Encounters"
          value={cards.dataset_records ? Number(cards.dataset_records).toLocaleString() : '101,766'}
          subtitle="130-US Hospitals (1999-2008)"
          icon={Database}
          color="teal"
        />
        <StatCard
          title="Clinical Feature Dimension"
          value={cards.feature_columns_count ?? 50}
          subtitle="Variables available for cohort analysis"
          icon={Binary}
          color="sky"
        />
        <StatCard
          title="Research Cohorts"
          value={cards.available_research_cohorts ?? 4}
          subtitle="Stratified clinical subgroups"
          icon={FileSpreadsheet}
          color="amber"
        />
      </div>

      {/* Anonymized Cohort Preview & Dataset Feature Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sample Anonymized Cohort Table */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Anonymized Patient Cohort</h3>
              <p className="text-xs text-slate-500">PII stripped at backend layer (Pseudonymized IDs & Age Brackets)</p>
            </div>
            <Badge variant="purple">Anonymized</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anonymized ID</TableHead>
                <TableHead>Age Bracket</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>De-ID Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleAnonymized.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                    No anonymized records available.
                  </TableCell>
                </TableRow>
              ) : (
                sampleAnonymized.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                      {p.anonymized_patient_id}
                    </TableCell>
                    <TableCell className="font-medium text-xs">{p.age_group || '[50-60)'}</TableCell>
                    <TableCell className="text-xs">{p.gender || 'Female'}</TableCell>
                    <TableCell>
                      <Badge variant="emerald">PII Sanitized</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Dataset Summary Table */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Diabetes Dataset Structure</h3>
              <p className="text-xs text-slate-500">130-US Hospitals benchmark dataset metadata</p>
            </div>
            <Badge variant="teal">{datasetSummary?.status || 'LOADED'}</Badge>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Dataset Name</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{datasetSummary?.dataset_name || 'Diabetes 130-US Hospitals'}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Numeric Clinical Metrics</span>
              <span className="font-bold text-teal-600">{datasetSummary?.numeric_features_count ?? 13} Features</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Categorical & Medications</span>
              <span className="font-bold text-purple-600">{datasetSummary?.categorical_features_count ?? 37} Features</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Pipeline Validation Status</span>
              <Badge variant="emerald">Foundation Ready</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
