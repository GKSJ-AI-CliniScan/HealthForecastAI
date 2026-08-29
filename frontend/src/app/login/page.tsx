'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/lib/auth-context';

/** Sign-in screen. Credentials are checked by the backend, never in the browser. */
export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit() {
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      // The error message is rendered from context state below.
    }
  }

  const disabled = loading || email.trim() === '' || password === '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">HealthForecast AI</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to the readmission risk platform
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                         outline-none focus:border-slate-900"
              placeholder="doctor@hospital.test"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !disabled) {
                  void handleSubmit();
                }
              }}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                         outline-none focus:border-slate-900"
            />
          </div>

          {error !== null && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={disabled}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white
                       transition hover:bg-slate-800 disabled:cursor-not-allowed
                       disabled:bg-slate-300"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Access is role based. What you can see depends on the role assigned to your account.
        </p>
      </div>
    </main>
  );
}
