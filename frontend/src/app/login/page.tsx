'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const DEMO_ROLES = [
  {
    role: 'Doctor',
    email: 'doctor@healthforecast.ai',
    password: 'password123',
    icon: '🩺',
    badge: 'Clinical Worksheets',
  },
  {
    role: 'Admin',
    email: 'admin@healthforecast.ai',
    password: 'password123',
    icon: '🏦',
    badge: 'Executive Analytics',
  },
  {
    role: 'Researcher',
    email: 'researcher@healthforecast.ai',
    password: 'password123',
    icon: '🧪',
    badge: 'De-identified Data',
  },
  {
    role: 'SysAdmin',
    email: 'sysadmin@healthforecast.ai',
    password: 'password123',
    icon: '💻',
    badge: 'Full Console',
  },
];

export default function LoginPage() {
  const { login, token, loading, error } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('doctor@healthforecast.ai');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) router.replace('/dashboard');
  }, [token, loading, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      // Navigation is handled by the useEffect that watches `token` below.
      // Calling router.replace() here would fire before React commits the new
      // token to context, causing AppShell to see token=null and redirect back.
    } catch {
      // The error is surfaced through auth context
    } finally {
      setSubmitting(false);
    }
  }

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setSubmitting(true);
    try {
      await login(demoEmail, demoPass);
      // Navigation is handled by the useEffect that watches `token` below.
    } catch {
      // Error handled in auth context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest muted">
            Predictive Healthcare Intelligence
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">HealthForecast AI</h1>
          <p className="muted mt-2 text-sm">
            Hospital readmission prediction and patient risk intelligence
          </p>
        </div>

        {/* Quick 1-Click Role Switcher */}
        <div className="card space-y-3 p-4 bg-surface">
          <p className="text-xs font-semibold uppercase tracking-wide muted text-center">
            Quick 1-Click Role Sign In
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((demo) => (
              <button
                key={demo.role}
                type="button"
                onClick={() => handleQuickLogin(demo.email, demo.password)}
                className="flex flex-col items-start p-2.5 rounded-lg border text-left hover:bg-surface-muted transition text-xs border-border"
              >
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <span>{demo.icon}</span>
                  <span>{demo.role}</span>
                </div>
                <span className="muted text-[10px] truncate w-full">{demo.badge}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="doctor@healthforecast.ai"
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
              className="rounded-lg px-3 py-2 text-xs font-medium"
              style={{ background: '#fdecea', color: '#8a1c12' }}
            >
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn w-full font-semibold text-sm" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in to Workspace'}
          </button>
        </form>

        <p className="muted text-center text-xs">
          Role-Based Access Control (RBAC) enforced. Clinical audit logs active.
        </p>
      </div>
    </main>
  );
}
