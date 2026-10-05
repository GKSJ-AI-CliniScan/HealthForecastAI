import { ROLE_LABELS } from '@/types';
import type { Role } from '@/types';

const STYLES: Record<Role, string> = {
  doctor: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:border-brand-800',
  hospital_admin: 'bg-warm-neutral text-warm-text border-warm-border dark:bg-warm-neutral/20 dark:text-warm-text dark:border-warm-border',
  researcher: 'bg-sage-50 text-sage-700 border-sage-200 dark:bg-sage-950/50 dark:text-sage-300 dark:border-sage-800',
  system_admin: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
};

/** Shows which role the signed-in user holds, so the scope of the page is obvious. */
export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STYLES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
