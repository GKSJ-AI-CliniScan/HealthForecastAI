'use client';

import Link from 'next/link';
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import { useAuth } from '@/hooks/use-auth';
import { ApiError, apiFetch } from '@/lib/api';
import type { Patient, User } from '@/types';

export default function Home() {
  const {
    token,
    currentUser,
    loading: authLoading,
    error: authError,
    login,
    logout,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await login(email, password);
    } catch {
      // The authentication provider supplies the displayed error.
    }
  }

  useEffect(() => {
    if (!token) {
      setPatients([]);
      setPatientsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPatients() {
      setPatientsLoading(true);

      try {
        const result = await apiFetch<Patient[]>(
          '/patients',
          {},
          token!,
        );

        if (!cancelled) {
          setPatients(result);
          setDataError('');
        }
      } catch (error) {
        if (!cancelled) {
          setDataError(
            requestError(error, 'Unable to load patient records.'),
          );
        }
      } finally {
        if (!cancelled) {
          setPatientsLoading(false);
        }
      }
    }

    void loadPatients();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || currentUser?.role !== 'system_admin') {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    let cancelled = false;

    async function loadUsers() {
      setUsersLoading(true);

      try {
        const result = await apiFetch<User[]>('/users', {}, token!);

        if (!cancelled) {
          setUsers(result);
        }
      } catch (error) {
        if (!cancelled) {
          setDataError(
            requestError(error, 'Unable to load registered users.'),
          );
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [token, currentUser?.role]);

  if (authLoading) {
    return <LoadingScreen text="Loading clinical workspace..." />;
  }

  if (!token || !currentUser) {
    return (
      <LoginPage
        email={email}
        password={password}
        error={authError}
        loading={authLoading}
        setEmail={setEmail}
        setPassword={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <main className="hf-page">
      <div className="hf-shell">
        <OverviewSidebar />

        <div className="hf-main min-w-0">
          <header className="hf-header">
            <div>
              <div className="min-w-0">
                <p className="hf-header-eyebrow">Clinical workspace</p>
                <p className="text-sm font-medium text-slate-700">
                  Patient management and clinical analytics
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    {formatRole(currentUser.role)}
                  </p>
                  <p className="text-xs text-slate-500">
                    User ID {currentUser.subject}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="hf-button hf-button-secondary"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <OverviewMobileNavigation />

          <div className="hf-content">
            {/* Page introduction */}
            <section className="mb-7">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <OverviewIcon />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Clinical overview
                </span>
              </div>

              <h1 className="hf-page-title">Healthcare dashboard</h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Monitor patient records and access clinical risk analytics
                available to your role.
              </p>
            </section>

            {/* Workspace KPIs */}
            <section
              className="hf-kpi-grid md:grid-cols-3"
              aria-label="Workspace summary"
            >
              <OverviewMetric
                label="Visible patients"
                value={patientsLoading ? '—' : patients.length.toLocaleString()}
              />

              <OverviewMetric
                label="Current role"
                value={formatRole(currentUser.role)}
              />

              <OverviewMetric
                label="Permissions"
                value={currentUser.permissions.length}
              />
            </section>

            {/* Risk prediction feature panel */}
            <section className="hf-panel mt-6">
              <div className="hf-section-head">
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Clinical intelligence
                  </p>
                  <h2>Risk prediction</h2>
                  <p>
                    Assess readmission probability, review high-risk patients,
                    and inspect model-derived factors.
                  </p>
                </div>

                <Link
                  href="/risk"
                  className="hf-button hf-button-primary shrink-0"
                >
                  Open risk dashboard
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
                <Feature
                  number="01"
                  title="Patient risk scoring"
                  text="Calculate an estimated readmission probability from admission features."
                />

                <Feature
                  number="02"
                  title="High-risk monitoring"
                  text="Review patients whose latest model prediction falls in the high-risk band."
                />

                <Feature
                  number="03"
                  title="Model explanation"
                  text="Review the factors contributing to an individual risk prediction."
                />
              </div>
            </section>

            {/* Patient records */}
            <section className="hf-panel mt-6">
              <SectionHeading
                eyebrow="Patient management"
                title="Patients"
                description="Patient records currently visible to your role."
                action={
                  <span className="text-xs font-medium text-slate-500">
                    {patientsLoading
                      ? 'Loading…'
                      : `${patients.length} ${patients.length === 1 ? 'record' : 'records'
                      }`}
                  </span>
                }
              />

              {patientsLoading ? (
                <LoadingRows />
              ) : patients.length === 0 ? (
                <EmptyState message="No patient records are currently available." />
              ) : (
                <PatientTable patients={patients} />
              )}
            </section>

            {/* User management is only visible to system administrators. */}
            {currentUser.role === 'system_admin' && (
              <section className="hf-panel mt-6">
                <SectionHeading
                  eyebrow="Administration"
                  title="User management"
                  description="Registered accounts in the platform."
                  action={
                    <span className="text-xs font-medium text-slate-500">
                      {usersLoading
                        ? 'Loading…'
                        : `${users.length} ${users.length === 1 ? 'user' : 'users'
                        }`}
                    </span>
                  }
                />

                {usersLoading ? (
                  <LoadingRows />
                ) : users.length === 0 ? (
                  <EmptyState message="No registered users were returned." />
                ) : (
                  <UserTable users={users} />
                )}
              </section>
            )}

            {dataError && (
              <div
                className="hf-alert hf-alert-danger mt-6 flex items-start justify-between gap-4"
                role="alert"
              >
                <span>{dataError}</span>
                <button
                  type="button"
                  className="shrink-0 font-semibold"
                  onClick={() => setDataError('')}
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
              </div>
            )}

            <footer className="mt-6 flex flex-col gap-2 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-400">
                HealthForecast AI · Clinical decision support
              </p>
              <p className="max-w-2xl text-xs leading-5 text-slate-400 sm:text-right">
                Model outputs support clinical review and do not replace
                professional clinical judgment.
              </p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar and navigation — matches the Risk page                              */
/* -------------------------------------------------------------------------- */

function OverviewSidebar() {
  return (
    <aside className="hf-sidebar">
      <div className="hf-sidebar-inner">
        <div className="hf-sidebar-brand">
          <BrandMark />
          <p className="mt-2">Clinical workspace</p>
        </div>

        <div className="px-5 pb-1 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400">
            Workspace
          </p>
        </div>

        <nav className="hf-sidebar-nav" aria-label="Primary navigation">
          <Link
            href="/"
            className="hf-nav-item hf-nav-active"
            aria-current="page"
          >
            <OverviewIcon />
            <span>Overview</span>
          </Link>

          <Link href="/risk" className="hf-nav-item">
            <ActivityIcon />
            <span>Risk prediction</span>
          </Link>

          <Link href="/analytics" className="hf-nav-item">
            <ChartIcon />
            <span>Healthcare analytics</span>
          </Link>
        </nav>

        <div className="mt-auto px-4 pb-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-700">
                <ShieldIcon />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Clinical workspace
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Patient monitoring
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="hf-sidebar-footer">
          <p>Application</p>
          <p>HealthForecast AI</p>
        </div>
      </div>
    </aside>
  );
}

function OverviewMobileNavigation() {
  return (
    <nav className="hf-mobile-nav" aria-label="Primary navigation">
      <Link href="/" className="active" aria-current="page">
        Overview
      </Link>
      <Link href="/risk">Risk prediction</Link>
      <Link href="/analytics">Analytics</Link>
    </nav>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
        <BrandIcon />
      </span>
      <span className="text-[15px] font-bold tracking-tight text-slate-900">
        HealthForecast <span className="text-blue-600">AI</span>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard components                                                        */
/* -------------------------------------------------------------------------- */

function OverviewMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="hf-kpi">
      <p>{label}</p>
      <p>{value}</p>
    </div>
  );
}

function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="min-w-0 px-5 py-5">
      <span className="inline-flex h-7 w-8 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-semibold text-blue-700">
        {number}
      </span>
      <h3 className="mt-4 text-sm font-semibold leading-5 text-slate-800">
        {title}
      </h3>
      <p className="mt-2 text-xs font-normal leading-5 text-slate-500">
        {text}
      </p>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="hf-section-head">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {eyebrow}
        </p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Patient and user tables                                                     */
/* -------------------------------------------------------------------------- */

function PatientTable({ patients }: { patients: Patient[] }) {
  return (
    <div className="hf-table-wrapper">
      <table className="min-w-[720px] text-left">
        <thead>
          <tr>
            <TableHead>Medical record number</TableHead>
            <TableHead>Age group</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Primary diagnosis</TableHead>
            <TableHead>Doctor</TableHead>
          </tr>
        </thead>

        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id} className="hf-table-row">
              <td className="hf-table-cell">
                <span className="font-semibold text-blue-700">
                  {patient.medical_record_number}
                </span>
              </td>
              <td className="hf-table-cell">
                {patient.age_group ?? 'Not recorded'}
              </td>
              <td className="hf-table-cell">
                {patient.gender ?? 'Not recorded'}
              </td>
              <td className="hf-table-cell">
                {patient.primary_diagnosis ?? 'Not recorded'}
              </td>
              <td className="hf-table-cell">
                {patient.assigned_doctor_id ?? 'Unassigned'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserTable({ users }: { users: User[] }) {
  return (
    <div className="hf-table-wrapper">
      <table className="min-w-[760px] text-left">
        <thead>
          <tr>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="hf-table-row">
              <td className="hf-table-cell">
                <span className="font-semibold text-slate-800">
                  {user.full_name}
                </span>
              </td>
              <td className="hf-table-cell">{user.email}</td>
              <td className="hf-table-cell">{formatRole(user.role)}</td>
              <td className="hf-table-cell">
                {user.department ?? 'Not assigned'}
              </td>
              <td className="hf-table-cell">
                <StatusBadge active={user.is_active} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="hf-table-head">{children}</th>;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold ${active
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <InfoIcon />
      </span>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-5" role="status" aria-label="Loading records">
      <div className="hf-skeleton h-10 w-full" />
      <div className="hf-skeleton h-10 w-full" />
      <div className="hf-skeleton h-10 w-full" />
    </div>
  );
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="text-center">
        <span className="hf-spinner mx-auto mb-4 block" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-600">{text}</p>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Login                                                                       */
/* -------------------------------------------------------------------------- */

function LoginPage({
  email,
  password,
  error,
  loading,
  setEmail,
  setPassword,
  onSubmit,
}: {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="hf-page flex min-h-screen">
      <section className="hf-login-hero">
        <div className="max-w-xl">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">
              HealthForecast AI
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-white">
              Clinical risk intelligence for hospital teams.
            </h1>
          </div>

          <p className="mt-8 max-w-lg text-base leading-7 text-slate-300">
            A secure workspace for patient data, readmission risk prediction
            and healthcare analytics.
          </p>

          <div className="mt-12 border-t border-white/10 pt-6">
            <p className="text-sm font-medium text-white">
              Workspace capabilities
            </p>
            <div className="mt-5 space-y-4">
              <LoginFeature text="Role-based patient access" />
              <LoginFeature text="Readmission risk prediction" />
              <LoginFeature text="Model-derived risk drivers" />
              <LoginFeature text="Hospital and treatment analytics" />
            </div>
          </div>
        </div>
      </section>

      <section className="hf-login-form-area">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandMark />
            <h1 className="mt-4 hf-page-title">Clinical workspace</h1>
          </div>

          <div className="hf-login-card">
            <div className="border-b border-slate-200 pb-6">
              <p className="text-sm font-medium text-blue-700">
                Secure sign in
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Sign in to your workspace
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use your authorized HealthForecast account to continue.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="hf-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="hf-input"
                  required
                />
              </div>

              {error && (
                <div className="hf-alert hf-alert-danger" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="hf-button hf-button-primary w-full"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-slate-500">
            Authorized healthcare workspace
          </p>
        </div>
      </section>
    </main>
  );
}

function LoginFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-blue-400/40 text-xs text-blue-300"
        aria-hidden="true"
      >
        ✓
      </span>
      <p className="text-sm text-slate-300">{text}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared icons and formatting helpers                                         */
/* -------------------------------------------------------------------------- */

function BrandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true">
      <path
        d="M12 3v18M3 12h18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity=".65"
      />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
      <path
        d="M3 12h4l3-8 4 16 3-8h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 19.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="5" y="11" width="3.5" height="7" rx="1" fill="currentColor" opacity=".7" />
      <rect x="10.25" y="6" width="3.5" height="12" rx="1" fill="currentColor" opacity=".85" />
      <rect x="15.5" y="3.5" width="3.5" height="14.5" rx="1" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 19 6v5.5c0 4.2-2.8 7.1-7 9-4.2-1.9-7-4.8-7-9V6l7-2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function formatRole(role: string) {
  return role
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function requestError(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}