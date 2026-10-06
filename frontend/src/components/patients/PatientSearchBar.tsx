'use client';

import React from 'react';
import { SearchIcon, RefreshCwIcon } from '@/components/ui/Icons';
import { RiskCategory } from '@/types';

export interface PatientSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedRisk: RiskCategory | 'all';
  onRiskChange: (risk: RiskCategory | 'all') => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onReset?: () => void;
  role?: string;
  scope?: 'all' | 'assigned';
  onScopeChange?: (scope: 'all' | 'assigned') => void;
}

export function PatientSearchBar({
  searchQuery,
  onSearchChange,
  selectedRisk,
  onRiskChange,
  selectedStatus,
  onStatusChange,
  onReset,
  role = 'doctor',
  scope = 'all',
  onScopeChange,
}: PatientSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-text-light" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by MRN, patient name, diagnosis, or department..."
          aria-label="Search patients"
          className="w-full rounded-lg border border-warm-border bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-warm-text placeholder:text-warm-text-light focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-warm-border dark:bg-warm-card dark:text-warm-text dark:placeholder:text-warm-text-light"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-warm-text-muted hover:text-warm-text dark:hover:text-warm-text"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Doctor Caseload Toggle */}
        {role === 'doctor' && onScopeChange && (
          <div className="flex items-center rounded-lg border border-warm-border bg-warm-neutral/40 p-0.5 dark:border-warm-border dark:bg-warm-neutral/15">
            <button
              type="button"
              onClick={() => onScopeChange('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                scope === 'all'
                  ? 'bg-white text-warm-text shadow-sm dark:bg-warm-card dark:text-warm-text'
                  : 'text-warm-text-muted hover:text-warm-text dark:text-warm-text-muted dark:hover:text-warm-text'
              }`}
            >
              All Patients
            </button>
            <button
              type="button"
              onClick={() => onScopeChange('assigned')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                scope === 'assigned'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-warm-text-muted hover:text-warm-text dark:text-warm-text-muted dark:hover:text-warm-text'
              }`}
            >
              My Assigned Patients
            </button>
          </div>
        )}

        {/* Risk Filter */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="risk-filter" className="text-xs font-medium text-warm-text-muted dark:text-warm-text-muted">
            Risk:
          </label>
          <select
            id="risk-filter"
            value={selectedRisk}
            onChange={(e) => onRiskChange(e.target.value as RiskCategory | 'all')}
            className="rounded-lg border border-warm-border bg-white py-1.5 px-2.5 text-xs text-warm-text focus:border-brand-500 focus:outline-none dark:border-warm-border dark:bg-warm-card dark:text-warm-text"
          >
            <option value="all">All Risk Tiers</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="status-filter" className="text-xs font-medium text-warm-text-muted dark:text-warm-text-muted">
            Status:
          </label>
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-lg border border-warm-border bg-white py-1.5 px-2.5 text-xs text-warm-text focus:border-brand-500 focus:outline-none dark:border-warm-border dark:bg-warm-card dark:text-warm-text"
          >
            <option value="all">All Patients</option>
            <option value="inpatient">Inpatient</option>
            <option value="discharged">Discharged</option>
          </select>
        </div>

        {/* Reset Filters */}
        {onReset && (searchQuery || selectedRisk !== 'all' || selectedStatus !== 'all') && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg border border-warm-border bg-warm-neutral/40 px-2.5 py-1.5 text-xs font-medium text-warm-text hover:bg-warm-neutral dark:border-warm-border dark:bg-warm-neutral/20 dark:text-warm-text"
            title="Reset all filters"
          >
            <RefreshCwIcon className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
