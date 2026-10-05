// FILE: src/app/login/page.tsx

'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Activity,
  BrainCircuit,
  Stethoscope,
  BarChart3,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

function ClinicalVisual() {
  return (
    <div className="relative mx-auto mt-10 w-full max-w-[590px]">
      {/* Ambient glow */}
      <div className="absolute -inset-8 rounded-[50px] bg-emerald-300/10 blur-3xl" />

      {/* Main glass dashboard */}
      <div className="relative overflow-hidden rounded-[30px] border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl">
        {/* Top mini header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-200">
              <Activity className="h-5 w-5" />
            </div>

            <div>
              <div className="text-sm font-semibold text-white">
                Patient Risk Intelligence
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-200/70">
                Clinical analytics
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-100/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            <span className="text-[10px] font-semibold text-emerald-100">
              AI ENABLED
            </span>
          </div>
        </div>

        {/* Analytics cards */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
            <div className="flex items-center gap-2 text-emerald-200/70">
              <BrainCircuit className="h-4 w-4" />
              <span className="text-[10px] font-medium uppercase tracking-wide">
                Risk
              </span>
            </div>

            <div className="mt-3 text-lg font-bold text-white">
              Intelligence
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[72%] rounded-full bg-emerald-300/70" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
            <div className="flex items-center gap-2 text-cyan-200/70">
              <BarChart3 className="h-4 w-4" />
              <span className="text-[10px] font-medium uppercase tracking-wide">
                Forecast
              </span>
            </div>

            <div className="mt-3 text-lg font-bold text-white">
              Predictive
            </div>

            <div className="mt-2 flex h-1.5 items-end gap-1">
              <span className="h-2 w-1.5 rounded-full bg-cyan-300/30" />
              <span className="h-3 w-1.5 rounded-full bg-cyan-300/40" />
              <span className="h-4 w-1.5 rounded-full bg-cyan-300/50" />
              <span className="h-5 w-1.5 rounded-full bg-cyan-300/70" />
              <span className="h-6 w-1.5 rounded-full bg-cyan-300" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
            <div className="flex items-center gap-2 text-rose-200/70">
              <Stethoscope className="h-4 w-4" />
              <span className="text-[10px] font-medium uppercase tracking-wide">
                Care
              </span>
            </div>

            <div className="mt-3 text-lg font-bold text-white">
              Support
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-300/80" />
              <span className="text-[10px] text-white/50">
                Role aware
              </span>
            </div>
          </div>
        </div>

        {/* ECG panel */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/20">
          <div className="absolute left-4 top-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Clinical signal
          </div>

          <svg
            viewBox="0 0 700 180"
            className="h-[180px] w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="signalGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.25" />
                <stop offset="45%" stopColor="#67e8f9" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.55" />
              </linearGradient>
            </defs>

            {/* Grid */}
            <g opacity="0.12">
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 64}
                  y1="0"
                  x2={i * 64}
                  y2="180"
                  stroke="white"
                />
              ))}

              {Array.from({ length: 6 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i * 36}
                  x2="700"
                  y2={i * 36}
                  stroke="white"
                />
              ))}
            </g>

            {/* Glow */}
            <path
              d="M0 105
                 C35 105 48 104 70 104
                 C90 103 96 103 112 104
                 L130 104
                 L143 68
                 L157 132
                 L171 104
                 C205 103 225 103 252 104
                 C280 105 291 103 312 104
                 L330 104
                 L345 55
                 L360 138
                 L374 104
                 C410 104 435 104 465 103
                 C495 102 510 104 532 104
                 L548 104
                 L562 76
                 L575 126
                 L588 104
                 C620 103 655 103 700 104"
              fill="none"
              stroke="#67e8f9"
              strokeOpacity="0.12"
              strokeWidth="13"
            />

            {/* Main signal */}
            <path
              d="M0 105
                 C35 105 48 104 70 104
                 C90 103 96 103 112 104
                 L130 104
                 L143 68
                 L157 132
                 L171 104
                 C205 103 225 103 252 104
                 C280 105 291 103 312 104
                 L330 104
                 L345 55
                 L360 138
                 L374 104
                 C410 104 435 104 465 103
                 C495 102 510 104 532 104
                 L548 104
                 L562 76
                 L575 126
                 L588 104
                 C620 103 655 103 700 104"
              fill="none"
              stroke="url(#signalGradient)"
              strokeWidth="3"
            />
          </svg>

          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2 backdrop-blur">
            <HeartPulse className="h-4 w-4 text-emerald-300" />
            <span className="text-[10px] font-medium text-white/70">
              Continuous clinical insight
            </span>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-5 -left-5 flex items-center gap-3 rounded-2xl border border-white/15 bg-[#123d45]/90 px-4 py-3 shadow-xl backdrop-blur-xl">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300 text-[#063b32]">
          <HeartPulse className="h-5 w-5" />
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            HealthForecast AI
          </div>
          <div className="mt-0.5 text-xs text-white/60">
            Clinical decision intelligence
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, token, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && token) {
      router.replace('/dashboard');
    }
  }, [isLoading, token, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();

    setError('');
    setBusy(true);

    try {
      await login(email.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect email or password.'
          : err instanceof ApiError
            ? err.message
            : 'Unable to sign in right now.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f8f6]">
      <div className="grid min-h-screen lg:grid-cols-[0.92fr_1.08fr]">
        {/* =========================================================
            LEFT — LOGIN
        ========================================================= */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
          {/* Soft background shapes */}
          <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-rose-100/40 blur-3xl" />

          <div className="relative z-10 w-full max-w-[530px]">
            {/* Brand */}
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0b2947] text-white shadow-lg shadow-slate-900/10">
                <HeartPulse className="h-5 w-5" />
              </div>

              <div>
                <div className="text-[17px] font-bold tracking-tight text-[#0b2947]">
                  HealthForecast AI
                </div>

                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-700">
                  Clinical Console
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                Secure workspace
              </div>

              <h1 className="text-[40px] font-bold leading-[1.08] tracking-[-0.035em] text-[#09243f] sm:text-[44px]">
                Welcome back.
              </h1>

              <p className="mt-3 max-w-md text-[14px] leading-6 text-slate-500">
                Sign in to access your clinical workspace and the tools
                assigned to your role.
              </p>
            </div>

            {/* Login Card */}
            <form
              onSubmit={submit}
              className="rounded-[28px] border border-slate-200/90 bg-white p-7 shadow-[0_20px_60px_-25px_rgba(15,40,60,0.22)] sm:p-9"
            >
              <div className="space-y-6">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="text-[12px] font-bold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative mt-2">
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@hospital.org"
                      className="h-[54px] w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-[12px] font-bold text-slate-700"
                    >
                      Password
                    </label>
                  </div>

                  <div className="relative mt-2">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-[54px] w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 pr-12 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium leading-5 text-red-700"
                  >
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={busy}
                  className="group flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0b2947] px-5 text-[14px] font-bold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-[#0e3558] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to console
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>

              {/* Security note */}
              <div className="mt-7 flex items-start gap-3 border-t border-slate-100 pt-6">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-700">
                    Role-aware access
                  </p>

                  <p className="mt-0.5 text-[10px] leading-5 text-slate-500">
                    Workspace access and clinical tools are determined by
                    your assigned permissions.
                  </p>
                </div>
              </div>
            </form>

            <p className="mt-7 text-center text-[10px] text-slate-400">
              HealthForecast AI · Clinical risk intelligence platform
            </p>
          </div>
        </section>

        {/* =========================================================
            RIGHT — PRODUCT VISUAL
        ========================================================= */}
        <section className="relative hidden min-h-screen overflow-hidden lg:flex">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#062b35] via-[#075c60] to-[#0c8a78]" />

          {/* Decorative gradients */}
          <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-emerald-200/10 blur-3xl" />
          <div className="absolute -bottom-48 -left-32 h-[600px] w-[600px] rounded-full bg-cyan-200/10 blur-3xl" />

          {/* Fine grid */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
              backgroundSize: '42px 42px',
            }}
          />

          <div className="relative z-10 flex w-full flex-col justify-between px-10 py-10 xl:px-16">
            {/* Top */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.8)]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/80">
                  Clinical intelligence platform
                </span>
              </div>

              <div className="text-[10px] font-medium text-white/45">
                HEALTHFORECAST AI
              </div>
            </div>

            {/* Main */}
            <div className="mx-auto w-full max-w-[700px] py-12">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
                  See the risk. Plan the next step.
                </p>

                <h2 className="mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-white xl:text-5xl">
                  Smarter insight for
                  <span className="block text-emerald-200">
                    better clinical decisions.
                  </span>
                </h2>

                <p className="mt-5 max-w-lg text-sm leading-6 text-white/60">
                  A focused workspace for readmission risk, forecasting,
                  treatment outcomes and role-aware clinical support.
                </p>
              </div>

              <ClinicalVisual />
            </div>

            {/* Bottom */}
            <div className="flex items-center justify-between border-t border-white/10 pt-5">
              <div className="flex items-center gap-2 text-[10px] text-white/45">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-200/70" />
                Secure role-based workspace
              </div>

              <div className="text-[10px] text-white/35">
                Clinical Console
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}