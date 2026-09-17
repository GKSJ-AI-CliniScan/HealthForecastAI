import React, { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';
import { ClinicalDisclaimer } from '@/components/common/ClinicalDisclaimer';
import { HospitalPerformanceCards } from '@/components/analytics/HospitalPerformanceCards';
import { TreatmentOutcomeChart } from '@/components/analytics/TreatmentOutcomeChart';
import { HealthcareTrendChart } from '@/components/analytics/HealthcareTrendChart';
import { DepartmentPerformanceTable } from '@/components/analytics/DepartmentPerformanceTable';
import {
  useHospitalPerformance,
  useDepartmentAnalytics,
  useHealthcareTrends,
} from '@/features/analytics/analytics.hooks';

export const HospitalPerformance: React.FC = () => {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const {
    data: perfData,
    isLoading: perfLoading,
    isError: perfError,
    refetch,
  } = useHospitalPerformance();

  const { data: deptData, isLoading: deptLoading } = useDepartmentAnalytics();
  const { data: trendData, isLoading: trendLoading } = useHealthcareTrends({ frequency });

  if (perfLoading || deptLoading || trendLoading) return <LoadingSkeleton rows={4} />;
  if (perfError || !perfData) {
    return (
      <ErrorAlert
        message="Unable to retrieve hospital operational performance metrics."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Operational Performance & Clinical KPIs"
        subtitle="Comprehensive healthcare intelligence, department workloads, patient flow, and readmission risk cross-referencing."
      />

      <ClinicalDisclaimer />

      {/* KPI Cards */}
      <HospitalPerformanceCards data={perfData} />

      {/* Charts: Trends & Outcome Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HealthcareTrendChart
            trends={trendData?.trends || []}
            frequency={frequency}
            onFrequencyChange={setFrequency}
          />
        </div>
        <div>
          <TreatmentOutcomeChart
            outcomeDistribution={perfData.patient_outcome_distribution}
            title="Hospital Patient Outcomes"
            subtitle="Overall distribution of recorded recovery outcomes across hospital units"
          />
        </div>
      </div>

      {/* Department Breakdown Table */}
      {deptData && (
        <DepartmentPerformanceTable departments={deptData.departments} />
      )}
    </div>
  );
};
