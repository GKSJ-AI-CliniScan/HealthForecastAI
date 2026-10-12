'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import BrandMark from '@/components/layout/BrandMark';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { ExperimentalNotice } from '@/components/ui/ModelDisclaimer';

/**
 * Sign-in screen.
 *
 * The form posts to /api/session rather than to the backend directly, so the
 * access token is set as an httpOnly cookie and never reaches client JavaScript.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.detail ?? 'Could not sign in');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <BrandPanel />

      <main className="relative flex items-center justify-center px-5 py-10 sm:px-8 lg:py-16">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[26rem]">
          <h1 className="text-title text-ink">Sign in</h1>
          <p className="mt-1.5 text-ink-muted">Enter your HealthForecast AI email and password.</p>

          <ExperimentalNotice className="mt-6" />

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="field py-2.5 text-[0.9375rem]"
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field py-2.5 text-[0.9375rem]"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-danger/40 bg-danger-tint px-3 py-2 text-sm text-ink"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full py-2.5 text-[0.9375rem]"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

/**
 * Brand side of the sign-in screen. Everything here is static and true of the
 * product: what it is for, and the band scale it uses for every model score.
 */
function BrandPanel() {
  return (
    <section
      aria-label="About HealthForecast AI"
      className="relative overflow-hidden bg-brand-deep px-5 py-8 text-white sm:px-8 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14"
    >
      <div className="flex items-center gap-3">
        <BrandMark className="ring-1 ring-white/25 rounded-[7px]" />
        <span className="text-lg font-bold">HealthForecast AI</span>
      </div>

      <div className="mt-8 max-w-md lg:mt-0">
        <p className="text-[1.75rem] font-bold leading-[2.25rem] tracking-[-0.01em] lg:text-[2.125rem] lg:leading-[2.625rem]">
          Readmission risk and patient records for hospital care teams.
        </p>
        <p className="mt-4 text-[0.9375rem] leading-7 text-white/80">
          Doctors see their assigned patients, administrators see hospital-wide analytics, and
          researchers work with anonymised cohorts.
        </p>
      </div>

      <figure className="mt-10 hidden max-w-md lg:block" aria-label="How model scores are banded">
        <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-inset ring-white/20">
          <span className="h-full bg-zone-low-fill" style={{ width: '40%' }} />
          <span className="h-full border-l border-brand-deep bg-zone-medium-fill" style={{ width: '30%' }} />
          <span className="h-full border-l border-brand-deep bg-zone-high-fill" style={{ width: '30%' }} />
        </div>
        <div className="relative mt-2 h-4 text-xs tabular-nums text-white/75">
          <span className="absolute left-0">0.00</span>
          <span className="absolute -translate-x-1/2" style={{ left: '40%' }}>
            0.40
          </span>
          <span className="absolute -translate-x-1/2" style={{ left: '70%' }}>
            0.70
          </span>
          <span className="absolute right-0">1.00</span>
        </div>
        <figcaption className="mt-3 text-sm leading-6 text-white/80">
          Every model score is shown on this 0 to 1 scale, split into low, medium and high bands at
          fixed cut-offs of 0.40 and 0.70.
        </figcaption>
      </figure>
    </section>
  );
}
