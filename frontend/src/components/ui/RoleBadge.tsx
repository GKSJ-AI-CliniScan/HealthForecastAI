import { ROLE_LABELS } from '@/types';
import type { Role } from '@/types';

const STYLES: Record<Role, string> = {
  doctor: 'bg-blue-50 text-blue-700 border-blue-200',
  hospital_admin: 'bg-amber-50 text-amber-700 border-amber-200',
  researcher: 'bg-violet-50 text-violet-700 border-violet-200',
  system_admin: 'bg-slate-100 text-slate-700 border-slate-300',
};

/** Shows which role the signed-in user holds, so the scope of the page is obvious. */
export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${STYLES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
