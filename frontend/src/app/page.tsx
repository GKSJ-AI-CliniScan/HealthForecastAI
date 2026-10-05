// FILE: src/app/page.tsx

'use client';

import {
  type FormEvent,
  useState,
} from 'react';

import {
  Activity,
  ArrowRight,
  HeartPulse,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth-context';

export default function SignInPage() {
  const router = useRouter();

  const { login } = useAuth();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(email, password);

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sign in. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f8fc] p-0 md:p-1">
      <div className="mx-auto flex min-h-screen max-w-[1500px] overflow-hidden rounded-none bg-white shadow-sm md:rounded-xl">

        {/* LEFT VISUAL PANEL */}

        <section className="relative hidden w-[52%] overflow-hidden bg-[#082b49] lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(32,193,197,.32),transparent_35%),linear-gradient(145deg,#071d38,#083c5a_55%,#087e88)]" />

          <div className="relative z-10 flex w-full flex-col px-12 py-10 text-white xl:px-16">

            {/* Brand */}

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                <HeartPulse size={23} />
              </div>

              <div>
                <div className="text-lg font-bold">
                  HealthForecast AI
                </div>

                <div className="text-[10px] font-semibold tracking-[0.22em] text-cyan-200">
                  CLINICAL CONSOLE
                </div>
              </div>
            </div>

            {/* Abstract medical illustration */}

            <div className="relative mt-14 flex flex-1 items-center justify-center">

              <div className="absolute h-[390px] w-[390px] rounded-full border border-white/10" />

              <div className="absolute h-[300px] w-[300px] rounded-full border border-white/10" />

              <div className="absolute h-[210px] w-[210px] rounded-full border border-white/10" />

              <div className="relative flex h-[190px] w-[190px] items-center justify-center rounded-[42px] border border-white/20 bg-white/10 shadow-2xl backdrop-blur-sm">

                <div className="absolute inset-5 rounded-[32px] border border-cyan-200/20" />

                <svg
                  viewBox="0 0 220 180"
                  className="h-36 w-44 text-cyan-200"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    d="M8 92h34l13-39 25 82 26-103 25 79 14-32h67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div className="absolute bottom-5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium">
                  AI risk intelligence
                </div>
              </div>

              <div className="absolute left-[12%] top-[18%] rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <Activity
                  size={22}
                  className="text-cyan-200"
                />
              </div>

              <div className="absolute right-[12%] top-[28%] rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <ShieldCheck
                  size={22}
                  className="text-emerald-200"
                />
              </div>

              <div className="absolute bottom-[17%] left-[18%] rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <Sparkles
                  size={22}
                  className="text-teal-200"
                />
              </div>
            </div>

            <div className="max-w-xl pb-5">

              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-4 py-2 text-sm">
                <Sparkles size={15} />
                Patient risk intelligence
              </div>

              <h1 className="text-4xl font-bold leading-[1.08] xl:text-5xl">
                Smarter insight.
                <br />
                Safer decisions.
              </h1>

              <p className="mt-5 max-w-lg text-sm leading-6 text-slate-200">
                Risk scoring, readmission forecasting and treatment analytics
                in one clinical workspace.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                {[
                  'Risk scoring',
                  'Forecasting',
                  'Clinical support',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs"
                  >
                    <div className="font-semibold">
                      {item}
                    </div>

                    <div className="mt-1 text-slate-300">
                      Role-based access
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT SIGN IN */}

        <section className="flex flex-1 items-center justify-center bg-[#f7f9fc] px-6 py-10 md:px-12">
          <div className="w-full max-w-[440px]">

            <div className="mb-7">

              <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-cyan-700">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                SECURE WORKSPACE
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-[#082544]">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sign in to continue to your clinical workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_15px_45px_rgba(15,43,70,.07)]">

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="doctor@hospital.com"
                    required
                    autoComplete="email"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                  />
                </div>

                <div>

                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-xs font-medium text-cyan-700 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#092846] text-sm font-semibold text-white transition hover:bg-[#0d365d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? 'Signing in...'
                    : 'Sign in to console'}

                  {!loading && (
                    <ArrowRight size={17} />
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <ShieldCheck size={17} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Secure clinical access
                  </p>

                  <p className="text-[11px] text-slate-400">
                    Access follows your assigned role and permissions.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">
              HealthForecast AI provides decision-support information and does
              not replace clinician judgment.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}