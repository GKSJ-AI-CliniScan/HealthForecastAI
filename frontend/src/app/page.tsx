'use client';

import { FormEvent, useEffect, useState } from 'react';

import { apiFetch, ApiError } from '@/lib/api';
import type { Patient, Role, User } from '@/types';

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  permissions: string[];
}

interface MeResponse {
  subject: string;
  role: Role;
  permissions: string[];
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<MeResponse | null>(null);

  const [email, setEmail] = useState('admin@healthforecast.ai');
  const [password, setPassword] = useState('Admin@12345');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const result = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      setToken(result.access_token);

      const me = await apiFetch<MeResponse>(
        '/auth/me',
        {},
        result.access_token,
      );

      setCurrentUser(me);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to log in. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPatients() {
    if (!token) return;

    try {
      const result = await apiFetch<Patient[]>(
        '/patients',
        {},
        token,
      );

      setPatients(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load patients.',
      );
    }
  }

  async function loadUsers() {
    if (!token || currentUser?.role !== 'system_admin') return;

    try {
      const result = await apiFetch<User[]>(
        '/users',
        {},
        token,
      );

      setUsers(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load users.',
      );
    }
  }

  useEffect(() => {
    if (!token) return;

    void loadPatients();
  }, [token]);

  useEffect(() => {
    if (!token || currentUser?.role !== 'system_admin') return;

    void loadUsers();
  }, [token, currentUser]);

  function logout() {
    setToken(null);
    setCurrentUser(null);
    setPatients([]);
    setUsers([]);
    setError('');
  }

  if (!token || !currentUser) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.18),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.16),transparent_30%)]" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
          <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
            <section className="hidden flex-col justify-between border-r border-white/10 bg-gradient-to-br from-teal-500/15 via-cyan-500/5 to-transparent p-12 lg:flex">
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/15 ring-1 ring-teal-300/30">
                  <svg viewBox="0 0 24 24" className="h-7 w-7 text-teal-300" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h2.2l1.3-4 2.2 8 1.3-4H17" />
                  </svg>
                </div>

                <p className="mt-8 text-xs font-bold uppercase tracking-[0.28em] text-teal-300">
                  Predictive Healthcare Intelligence
                </p>
                <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
                  HealthForecast
                  <span className="block text-teal-300">AI</span>
                </h1>
                <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
                  A secure intelligence workspace for viewing patient insights,
                  healthcare data and role-based operational information.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-bold text-white">AI</p>
                  <p className="mt-1 text-xs text-slate-400">Healthcare Intelligence</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-bold text-white">RBAC</p>
                  <p className="mt-1 text-xs text-slate-400">Role-based access</p>
                </div>
              </div>
            </section>

            <section className="bg-white p-7 sm:p-10 lg:p-12">
              <div className="mx-auto max-w-md">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h2.2l1.3-4 2.2 8 1.3-4H17" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">HealthForecast AI</p>
                    <p className="text-xs text-slate-500">Healthcare Intelligence</p>
                  </div>
                </div>

                <div className="mt-7 lg:mt-0">
                  <p className="text-sm font-semibold text-teal-600">Welcome back</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                    Sign in to your workspace
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Access your healthcare dashboard with your authorized account.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="mt-8 space-y-5">
                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                      Email address
                    </label>
                    <div className="group relative">
                      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-teal-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 6 7 6 7-6" />
                      </svg>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    <div className="group relative">
                      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-teal-500" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="5" y="10" width="14" height="10" rx="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="9" />
                        <path strokeLinecap="round" d="M12 8v5M12 16h.01" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-teal-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in securely
                        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-xs text-slate-400">
                  Secure role-based healthcare access
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 ring-1 ring-teal-300/20">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-teal-300" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h2.2l1.3-4 2.2 8 1.3-4H17" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">HealthForecast AI</p>
              <h1 className="text-lg font-bold text-white">Healthcare Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold capitalize text-white">
                {currentUser.role.replace('_', ' ')}
              </p>
              <p className="text-xs text-slate-500">ID: {currentUser.subject}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-400/10 text-sm font-bold text-teal-300 ring-1 ring-teal-300/20">
              {currentUser.role.slice(0, 1).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5M15 12H3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 19V5a2 2 0 0 0-2-2h-6" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:py-10">
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 8v5M12 16h.01" />
              </svg>
              {error}
            </div>
          )}

          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/15 bg-teal-300/5 px-3 py-1.5 text-xs font-semibold text-teal-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_10px_rgba(94,234,212,0.8)]" />
              Live healthcare workspace
            </div>
            <p className="mt-5 text-sm font-medium text-slate-500">Overview</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Welcome to your dashboard
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Monitor the healthcare data available to your current role from one secure workspace.
            </p>
          </section>

          <section className="mt-7 grid gap-4 md:grid-cols-3">
            <StatCard title="Visible Patients" value={patients.length} icon="patients" />
            <StatCard title="Your Role" value={currentUser.role.replace('_', ' ')} icon="role" />
            <StatCard title="Permissions" value={currentUser.permissions.length} icon="permissions" />
          </section>

          <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/10 backdrop-blur-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20V9m7 11V4m7 16v-7" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-white">Patients</h2>
                </div>
                <p className="mt-1 pl-11 text-sm text-slate-500">
                  Patients visible to your current role.
                </p>
              </div>
              <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                {patients.length} record{patients.length === 1 ? '' : 's'}
              </span>
            </div>

            {patients.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-500">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M16 4.2a3.5 3.5 0 0 1 0 6.6" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-300">No patients currently visible</p>
                <p className="mt-1 text-sm text-slate-500">There are no patient records available for this role.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-white/[0.025] text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">MRN</th>
                      <th className="px-6 py-4">Age Group</th>
                      <th className="px-6 py-4">Gender</th>
                      <th className="px-6 py-4">Diagnosis</th>
                      <th className="px-6 py-4">Doctor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {patients.map((patient) => (
                      <tr key={patient.id} className="transition hover:bg-white/[0.035]">
                        <td className="px-6 py-4">
                          <span className="rounded-lg border border-teal-300/10 bg-teal-300/5 px-2.5 py-1 font-mono text-xs font-semibold text-teal-300">
                            {patient.medical_record_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300">{patient.age_group ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-300">{patient.gender ?? '—'}</td>
                        <td className="max-w-xs px-6 py-4 font-medium text-slate-200">{patient.primary_diagnosis ?? '—'}</td>
                        <td className="px-6 py-4 text-slate-400">{patient.assigned_doctor_id ?? 'Unassigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {currentUser.role === 'system_admin' && (
            <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/10 backdrop-blur-sm">
              <div className="flex flex-col justify-between gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M16 4.2a3.5 3.5 0 0 1 0 6.6" />
                      </svg>
                    </div>
                    <h2 className="font-bold text-white">User Management</h2>
                  </div>
                  <p className="mt-1 pl-11 text-sm text-slate-500">
                    Visible only to System Administrators.
                  </p>
                </div>
                <span className="w-fit rounded-full border border-cyan-300/10 bg-cyan-300/5 px-3 py-1.5 text-xs font-semibold text-cyan-300">
                  Administrator
                </span>
              </div>

              {users.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-slate-500">
                  No users found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-white/[0.025] text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {users.map((user) => (
                        <tr key={user.id} className="transition hover:bg-white/[0.035]">
                          <td className="px-6 py-4 font-semibold text-white">{user.full_name}</td>
                          <td className="px-6 py-4 text-slate-400">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium capitalize text-slate-300">
                              {user.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{user.department ?? '—'}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_active
                                ? 'bg-emerald-400/10 text-emerald-300'
                                : 'bg-slate-400/10 text-slate-400'
                                }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-300' : 'bg-slate-500'}`} />
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: 'patients' | 'role' | 'permissions';
}) {
  const icons = {
    patients: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M16 4.2a3.5 3.5 0 0 1 0 6.6" />
      </svg>
    ),
    role: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6l-7-3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.7 1.7 3.5-3.5" />
      </svg>
    ),
    permissions: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M8 8h8M8 16h5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h10l4 4v14H5V3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v4h4" />
      </svg>
    ),
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-teal-300/20 hover:bg-white/[0.06]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-teal-400/5 blur-2xl transition group-hover:bg-teal-400/10" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black capitalize tracking-tight text-white">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300 ring-1 ring-teal-300/10">
          {icons[icon]}
        </div>
      </div>
    </div>
  );
}