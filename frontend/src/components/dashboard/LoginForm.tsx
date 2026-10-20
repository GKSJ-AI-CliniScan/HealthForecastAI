'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import type { LoginResponse } from '@/types';

const DEMO_ACCOUNTS = [
  { label: 'Doctor', email: 'doctor1@hospital.test', password: 'Doctor@123' },
  { label: 'Hospital admin', email: 'admin@hospital.test', password: 'Admin@123' },
  { label: 'Researcher', email: 'researcher@hospital.test', password: 'Research@123' },
  { label: 'System admin', email: 'sysadmin@hospital.test', password: 'SysAdmin@123' },
];

interface LoginFormProps {
  onLogin: (session: LoginResponse) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onLogin(session);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect e-mail or password.'
          : 'Could not reach the API. Is the backend running on port 8000?',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-10 max-w-md space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <h2 className="text-xl font-semibold">Sign in</h2>
      <div className="flex flex-wrap gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            className="rounded border border-[var(--border)] px-2 py-1 text-xs"
            onClick={() => {
              setEmail(account.email);
              setPassword(account.password);
            }}
          >
            {account.label}
          </button>
        ))}
      </div>
      <label className="block text-sm">
        E-mail
        <input
          className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-3 py-2"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-3 py-2"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
        />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
      >
        {busy ? 'Signing in...' : 'Sign in'}
      </button>
      <p className="text-xs text-slate-500">
        Demo accounts use synthetic data only. The token is kept in memory, not in localStorage.
      </p>
    </form>
  );
}
