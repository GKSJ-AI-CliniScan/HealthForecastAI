import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { useAuth } from '@/hooks/useAuth';
import { DoctorDashboard } from '@/components/dashboard/DoctorDashboard';
import { HospitalAdminDashboard } from '@/components/dashboard/HospitalAdminDashboard';
import { ResearcherDashboard } from '@/components/dashboard/ResearcherDashboard';
import { SystemAdminDashboard } from '@/components/dashboard/SystemAdminDashboard';
import { LoadingSkeleton, ErrorAlert } from '@/components/common/FeedbackStates';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['dashboard-stats', user?.role],
    queryFn: adminApi.getDashboardStats,
    staleTime: 30000,
  });

  if (isLoading) {
    return <LoadingSkeleton rows={8} />;
  }

  if (isError || !metrics) {
    return (
      <ErrorAlert
        message="Unable to load dashboard intelligence metrics. Please ensure the backend service is running."
        onRetry={() => refetch()}
      />
    );
  }

  const role = user?.role || 'DOCTOR';

  switch (role) {
    case 'DOCTOR':
      return <DoctorDashboard metrics={metrics} />;
    case 'HOSPITAL_ADMIN':
      return <HospitalAdminDashboard metrics={metrics} />;
    case 'RESEARCHER':
      return <ResearcherDashboard metrics={metrics} />;
    case 'SYSTEM_ADMIN':
      return <SystemAdminDashboard metrics={metrics} />;
    default:
      return <DoctorDashboard metrics={metrics} />;
  }
};
