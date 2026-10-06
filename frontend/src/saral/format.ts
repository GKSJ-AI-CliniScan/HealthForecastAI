/**
 * format.ts — tiny helpers so every page shows "no value" the same way ("—").
 * WHY: a missing number must look missing, never like a real 0.
 */
export const dash = '—';
export const orDash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? dash : String(v);
