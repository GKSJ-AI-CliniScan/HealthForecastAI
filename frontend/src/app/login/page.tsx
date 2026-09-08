'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, token, loading, error } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) router.replace('/dashboard');
  }, [token, loading, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch {
      // The error is surfaced through the auth context below.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest muted">
            Predictive Healthcare Intelligence
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">HealthForecast AI</h1>
          <p className="muted mt-2 text-sm">
            Hospital readmission prediction and patient risk intelligence
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@healthforecast.org"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: '#fdecea', color: '#8a1c12' }}
            >
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="muted mt-6 text-center text-xs">
          Your role determines what you can see. Access is logged.
        </p>
      </div>
    </main>
  );
}
