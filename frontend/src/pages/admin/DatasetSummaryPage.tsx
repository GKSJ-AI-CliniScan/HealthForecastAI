import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, FileSpreadsheet, Binary, CheckCircle2 } from 'lucide-react';

import { adminApi } from '@/api/admin.api';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/common/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';

export const DatasetSummaryPage: React.FC = () => {
  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dataset-summary'],
    queryFn: adminApi.getDatasetSummary,
  });

  if (isLoading) return <LoadingSkeleton rows={8} />;
  if (isError || !summary) {
    return (
      <ErrorAlert
        message="Unable to load dataset metadata. Ensure dataset/raw/diabetic_data.csv is present."
        onRetry={() => refetch()}
      />
    );
  }

  const missingEntries = Object.entries(summary.missing_value_summary || {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diabetes 130-US Hospitals Dataset Pipeline"
        subtitle="Benchmark dataset (1999-2008) loaded and preprocessed for future ML readmission prediction milestones."
        badge={<Badge variant="teal">{summary.status}</Badge>}
      />

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Encounters"
          value={summary.total_records.toLocaleString()}
          subtitle="Hospital patient encounter rows"
          icon={Database}
          color="teal"
        />
        <StatCard
          title="Total Features"
          value={summary.total_columns}
          subtitle="Columns across dataset"
          icon={FileSpreadsheet}
          color="sky"
        />
        <StatCard
          title="Numerical Metrics"
          value={summary.numeric_features_count}
          subtitle="Lab counts, medications, stay"
          icon={Binary}
          color="purple"
        />
        <StatCard
          title="Categorical & Drugs"
          value={summary.categorical_features_count}
          subtitle="Diagnoses & 23 medications"
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missing Values Breakdown */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Missing Values Audit</h3>
              <p className="text-xs text-slate-500">Columns containing '?' or null values</p>
            </div>
            <Badge variant="amber">{missingEntries.length} Columns</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Column Feature</TableHead>
                <TableHead>Missing Count</TableHead>
                <TableHead className="text-right">Missing Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missingEntries.map(([col, cnt]) => {
                const pct = ((cnt / summary.total_records) * 100).toFixed(2);
                return (
                  <TableRow key={col}>
                    <TableCell className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {col}
                    </TableCell>
                    <TableCell className="text-xs">{cnt.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <Badge variant={Number(pct) > 50 ? 'rose' : 'amber'}>{pct}%</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Feature Columns List */}
        <Card className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Documented Feature Columns</h3>
            <p className="text-xs text-slate-500">50 Variables cataloged for downstream ML training</p>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-[360px] overflow-y-auto p-1">
            {summary.column_names.map((col, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700"
              >
                {col}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
