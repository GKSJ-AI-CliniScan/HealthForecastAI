import Link from 'next/link';

import { Card, StatTile } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { can, getToken, requireUser } from '@/lib/session';
import type { Patient } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Role-specific overview.
 *
 * A doctor's patient count is already narrowed to their own caseload by the
 * backend, so this page does no filtering of its own.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const token = await getToken();

  let patientCount: number | null = null;
  let unreachable = false;

  if (can(user, 'patient:read_assigned') || can(user, 'patient:read_all')) {
    try {
      const patients = await apiFetch<Patient[]>(
        '/patients?limit=200',
        { cache: 'no-store' },
        token,
      );
      patientCount = patients.length;
    } catch {
      unreachable = true;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Welcome{user.profile ? `, ${user.profile.full_name}` : ''}
        </h1>
        <p className="mt-1 text-sm opacity-70">
          {user.role === 'doctor'
            ? 'You are seeing the patients assigned to you.'
            : 'You are seeing hospital-wide data your role permits.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={user.role === 'doctor' ? 'Assigned patients' : 'Patients'}
          value={patientCount ?? '-'}
        />
        <StatTile label="Role" value={user.role} />
        <StatTile label="Permissions" value={user.permissions.length} />
      </div>

      {unreachable && (
        <Card title="Backend unavailable">
          <p className="text-sm opacity-70">
            The API did not respond. Start it with{' '}
            <code className="rounded bg-black/10 px-1">uvicorn app.main:app --reload</code> in{' '}
            <code className="rounded bg-black/10 px-1">backend/</code>.
          </p>
        </Card>
      )}

      <Card title="Your access">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {user.permissions.map((permission) => (
            <li key={permission} className="opacity-80">
              {permission}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        {(can(user, 'patient:read_assigned') || can(user, 'patient:read_all')) && (
          <Link
            href="/dashboard/patients"
            className="rounded-md border border-[var(--border)] px-3 py-1.5"
          >
            View patients
          </Link>
        )}
        {can(user, 'user:manage') && (
          <Link
            href="/dashboard/users"
            className="rounded-md border border-[var(--border)] px-3 py-1.5"
          >
            Manage users
          </Link>
        )}
      </div>
    </div>
  );
}
