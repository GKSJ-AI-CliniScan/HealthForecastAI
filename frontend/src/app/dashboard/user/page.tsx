// frontend/src/app/dashboard/users/page.tsx
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface AppUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLES = ['doctor', 'hospital_admin', 'researcher', 'system_admin'];

export default function UserManagementPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'doctor', department: '' });

  function load() {
    if (!token) return;
    setIsLoading(true);
    apiFetch<AppUser[]>('/users', {}, token)
      .then(setUsers)
      .catch(() => setError('Could not load users.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [token]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    try {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify(form) }, token);
      setShowCreate(false);
      setForm({ email: '', full_name: '', password: '', role: 'doctor', department: '' });
      load();
    } catch {
      setError('Could not create user. Check the email is unique.');
    }
  }

  async function handleDeactivate(id: number) {
    if (!token || !confirm('Deactivate this user?')) return;
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' }, token);
      load();
    } catch {
      setError('Could not deactivate user.');
    }
  }

  async function handleRoleChange(id: number, role: string) {
    if (!token) return;
    try {
      await apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }, token);
      load();
    } catch {
      setError('Could not update role.');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">User management</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">Create, update, and deactivate platform accounts.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showCreate ? 'Cancel' : '+ New user'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-risk-high">{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <input required placeholder="Full name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm" />
          <input required type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm" />
          <input placeholder="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm" />
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="col-span-2 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm">
            {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
          <button type="submit" className="col-span-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Create</button>
        </form>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs text-slate-500">{u.id}</td>
                <td className="px-4 py-3 font-medium">{u.full_name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.is_active ? 'bg-risk-low/10 text-risk-low' : 'bg-slate-100 text-slate-400'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.is_active && (
                    <button onClick={() => handleDeactivate(u.id)} className="text-xs text-risk-high hover:underline">
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && users.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No users found.</p>}
      </div>
    </div>
  );
}