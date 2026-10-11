/** Display helpers only - every figure is computed by the backend. */

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '-';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "Assigned doctor" cell: the doctor's display name (marked when it is the
 * viewer), a neutral fallback when only the id is known, never a bare id.
 */
export function assignedDoctorLabel(
  patient: { assigned_doctor_id: number | null; assigned_doctor_name?: string | null },
  viewerId: number | null,
): string {
  if (patient.assigned_doctor_id === null) {
    return 'Unassigned';
  }
  const name = patient.assigned_doctor_name?.trim();
  const self = viewerId !== null && patient.assigned_doctor_id === viewerId;
  if (name) {
    return self ? `${name} (you)` : name;
  }
  return self ? 'You' : 'Assigned doctor';
}

/** Turn a {label: count} map into chart rows, largest first. */
export function toCountRows(counts: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

/** Turn "treatment_effectiveness" into "Treatment effectiveness". */
export function humanise(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
