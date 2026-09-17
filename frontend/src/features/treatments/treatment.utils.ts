/**
 * Treatment presentation helpers.
 */

export const getEffectivenessTier = (score?: number | null): { label: string; color: string } => {
  if (score === null || score === undefined) return { label: 'Pending Evaluation', color: 'text-slate-400' };
  if (score >= 80) return { label: 'High Effectiveness', color: 'text-emerald-600 dark:text-emerald-400' };
  if (score >= 60) return { label: 'Moderate Effectiveness', color: 'text-blue-600 dark:text-blue-400' };
  if (score >= 40) return { label: 'Marginal Response', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Low Response / Resistant', color: 'text-rose-600 dark:text-rose-400' };
};
