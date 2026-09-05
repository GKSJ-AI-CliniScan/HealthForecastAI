'use client';

import { useState, type FormEvent } from 'react';
import { ErrorBlock, Loading } from '@/components/ui/StateBlock';
import { useApi } from '@/hooks/useApi';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS, type Role, type User } from '@/types';

const ROLES: Role[] = ['doctor', 'hospital_admin', 'researcher', 'system_admin'];

export default function UsersPage() {
  const { token, user: me } = useAuth();
  const { data, error, loading, reload } = useApi<User[]>('/users?limit=200');

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'doctor' as Role,
    department: '',
    password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      await apiPost(
        '/users',
        { ...form, department: form.department || null },
        token,
      );
      setForm({ email: '', full_name: '', role: 'doctor', department: '', password: '' });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the user');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(target: User) {
    setBusy(true);
    try {
      await apiPost(
        `/users/${target.id}/${target.is_active ? 'deactivate' : 'activate'}`,
        {},
        token,
      );
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not update the user');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">User management</h1>
        <p className="muted mt-1 text-sm">
          Accounts are deactivated, never deleted - the audit log references them.
        </p>
      </header>

      {error ? <ErrorBlock message={error} /> : null}
      {formError ? <ErrorBlock message={formError} /> : null}

      <section className="card">
        <h2 className="text-lg font-semibold">Create a user</h2>
        <form onSubmit={createUser} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="full_name">
              Full name
            </label>
            <input
              id="full_name"
              className="input"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="new_email">
              Email
            </label>
            <input
              id="new_email"
              type="email"
              className="input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="department">
              Department
            </label>
            <input
              id="department"
              className="input"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="new_password">
              Temporary password (minimum 8 characters)
            </label>
            <input
              id="new_password"
              type="password"
              className="input"
              minLength={8}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Working…' : 'Create user'}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Accounts</h2>
        {loading ? <Loading /> : null}
        {data ? (
          <div className="table-wrap">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Name</th>
                  <th className="th">Email</th>
                  <th className="th">Role</th>
                  <th className="th">Department</th>
                  <th className="th">Status</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td className="td font-medium">{row.full_name}</td>
                    <td className="td">{row.email}</td>
                    <td className="td">{ROLE_LABELS[row.role]}</td>
                    <td className="td">{row.department ?? '—'}</td>
                    <td className="td">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          background: row.is_active ? '#e6f4ea' : 'var(--surface-muted)',
                          color: row.is_active ? '#0f7b39' : 'var(--muted)',
                        }}
                      >
                        {row.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="td text-right">
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={busy || row.id === me?.id}
                        title={
                          row.id === me?.id
                            ? 'You cannot deactivate your own account'
                            : undefined
                        }
                        onClick={() => toggleActive(row)}
                      >
                        {row.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
