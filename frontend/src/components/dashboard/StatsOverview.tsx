'use client';

import React from 'react';
import { DashboardStats } from '@/types';
import { Card } from '@/components/ui/Card';
import {
  UsersIcon,
  ActivityIcon,
  HeartPulseIcon,
  ClockIcon,
  BarChartIcon,
} from '@/components/ui/Icons';
import { Skeleton } from '@/components/ui/Skeleton';

export interface StatsOverviewProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
}

export function StatsOverview({ stats, isLoading = false }: StatsOverviewProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-warm-border bg-white p-5 shadow-sm dark:border-warm-border dark:bg-warm-card space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton variant="circular" className="h-8 w-8" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

    const items = [
    {
      title: stats.scope === 'assigned' ? 'Assigned Patients' : 'Total Patients',
      value: stats.total_patients.toLocaleString(),
      description: stats.scope === 'assigned' ? 'Under your direct clinical care' : 'Across all hospital wards',
      icon: UsersIcon,
      color: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60',
    },
    {
      title: 'Total Admissions',
      value: stats.total_admissions.toLocaleString(),
      description: 'Recorded clinical encounters',
      icon: ActivityIcon,
      color: 'text-sage-700 dark:text-sage-400 bg-sage-50 dark:bg-sage-900/50',
    },
    {
      title: '30-Day Readmissions',
      value: stats.readmitted_within_30_days.toLocaleString(),
      description: `${stats.readmission_rate_percent}% readmission rate`,
      icon: HeartPulseIcon,
      color: 'text-coral-600 dark:text-coral-400 bg-coral-50 dark:bg-coral-900/50',
    },
    {
      title:
        stats.scope === 'hospital' && stats.bed_occupancy_percent !== undefined
          ? 'Bed Occupancy'
          : 'Avg Length of Stay',
      value:
        stats.scope === 'hospital' && stats.bed_occupancy_percent !== undefined
          ? `${stats.bed_occupancy_percent}%`
          : `${stats.average_length_of_stay_days} Days`,
      description:
        stats.scope === 'hospital' && stats.bed_occupancy_percent !== undefined
          ? 'Inpatient capacity utilization'
          : 'Average inpatient stay per admission',
      icon:
        stats.scope === 'hospital' && stats.bed_occupancy_percent !== undefined
          ? BarChartIcon
          : ClockIcon,
      color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/50',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card
            key={index}
            className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-warm-text-muted dark:text-warm-text-muted">
                {item.title}
              </span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-warm-text dark:text-warm-text">
                {item.value}
              </div>
              <p className="mt-1 text-[11px] text-warm-text-muted dark:text-warm-text-muted">
                {item.description}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
