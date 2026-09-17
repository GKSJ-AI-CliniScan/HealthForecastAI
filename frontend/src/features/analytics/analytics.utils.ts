/**
 * Analytics formatting and clinical presentation utilities.
 */

export const OUTCOME_COLORS: Record<string, string> = {
  IMPROVED: '#10B981', // emerald
  DISCHARGED_RECOVERED: '#10B981',
  STABLE: '#3B82F6', // blue
  NO_CHANGE: '#6B7280', // gray
  WORSENED: '#EF4444', // red
  COMPLICATIONS: '#F59E0B', // amber
  READMITTED: '#DC2626', // dark red
  COMPLETED: '#8B5CF6', // purple
  DISCONTINUED: '#F97316', // orange
  ADVERSE_EFFECT: '#DC2626',
  UNKNOWN: '#9CA3AF',
};

export const formatPercentage = (val?: number | null): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${val.toFixed(1)}%`;
};

export const formatScore = (val?: number | null): string => {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${Math.round(val)} / 100`;
};

export const getOutcomeBadgeClass = (outcome?: string | null): string => {
  const norm = (outcome || 'UNKNOWN').toUpperCase();
  if (norm.includes('IMPROV') || norm.includes('RECOVER')) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  }
  if (norm.includes('STABLE')) {
    return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  }
  if (norm.includes('WORSEN') || norm.includes('COMPLICATION') || norm.includes('READMIT') || norm.includes('ADVERSE')) {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  }
  if (norm.includes('COMPLETE')) {
    return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  }
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
};
