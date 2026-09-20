'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import type {
  Patient,
  User,
} from '@/types';

export default function Home() {
  const {
    token,
    currentUser,
    loading: authLoading,
    error: authError,
    login,
    logout,
  } = useAuth();

  const [email, setEmail] = useState(
    'admin@healthforecast.ai',
  );

  const [password, setPassword] = useState(
    'Admin@12345',
  );

  const [patients, setPatients] =
    useState<Patient[]>([]);

  const [users, setUsers] =
    useState<User[]>([]);

  const [dataError, setDataError] =
    useState('');

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      await login(email, password);
    } catch {
      // Error is displayed by AuthProvider.
    }
  }

  useEffect(() => {
    if (!token) return;

    async function loadPatients() {
      try {
        setDataError('');

        const result =
          await apiFetch<Patient[]>(
            '/patients',
            {},
            token,
          );

        setPatients(result);
      } catch (err) {
        setDataError(
          err instanceof ApiError
            ? err.message
            : 'Unable to load patients.',
        );
      }
    }

    void loadPatients();
  }, [token]);

  useEffect(() => {
    if (
      !token ||
      currentUser?.role !== 'system_admin'
    ) {
      return;
    }

    async function loadUsers() {
      try {
        const result =
          await apiFetch<User[]>(
            '/users',
            {},
            token,
          );

        setUsers(result);
      } catch (err) {
        setDataError(
          err instanceof ApiError
            ? err.message
            : 'Unable to load users.',
        );
      }
    }

    void loadUsers();
  }, [token, currentUser]);

  if (authLoading) {
    return (
      <main className="hf-shell items-center justify-center bg-[#f5f7fa]">
        <p className="text-sm text-slate-500">
          Loading workspace...
        </p>
      </main>
    );
  }

  if (!token || !currentUser) {
    return (
      <LoginPage
        email={email}
        password={password}
        loading={authLoading}
        error={authError}
        setEmail={setEmail}
        setPassword={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <main className="hf-page">
      <div className="hf-shell">

        <Sidebar
          currentPage="overview"
          role={currentUser.role}
        />

        <div className="hf-main">

          <Header
            currentUser={currentUser}
            onLogout={logout}
          />

          <div className="hf-content">

            {dataError && (
              <div className="mb-6 hf-alert hf-alert-danger">
                {dataError}
              </div>
            )}

            <div className="mb-7">
              <p className="text-sm text-slate-500">
                Overview
              </p>

              <h1 className="mt-1 hf-page-title">
                Healthcare Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor patients and access clinical
                risk analytics available to your role.
              </p>
            </div>

            <section className="hf-kpi-grid md:grid-cols-3">
              <Metric
                label="Visible patients"
                value={patients.length}
              />

              <Metric
                label="Current role"
                value={formatRole(
                  currentUser.role,
                )}
              />

              <Metric
                label="Permissions"
                value={
                  currentUser.permissions.length
                }
              />
            </section>

            <section className="mt-7 hf-panel">
              <div className="flex items-center justify-between hf-section-head">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Risk prediction
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Readmission risk, high-risk patient
                    identification and clinical model
                    explanations.
                  </p>
                </div>

                <Link
                  href="/risk"
                  className="border border-[#155eef] hf-button hf-button-primary"
                >
                  Open risk dashboard
                </Link>
              </div>

              <div className="grid divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
                <Feature
                  title="Patient risk scoring"
                  text="Calculate an estimated readmission probability from admission features."
                />

                <Feature
                  title="High-risk monitoring"
                  text="Review patients whose latest model prediction falls in the high-risk band."
                />

                <Feature
                  title="Model explanation"
                  text="Review the features that contributed most strongly to an individual prediction."
                />
              </div>
            </section>

            <section className="mt-7 hf-panel">
              <SectionHeader
                title="Patients"
                description="Patients currently visible to your role."
                count={patients.length}
              />

              {patients.length === 0 ? (
                <EmptyState text="No patient records are currently available." />
              ) : (
                <PatientTable
                  patients={patients}
                />
              )}
            </section>

            {currentUser.role ===
              'system_admin' && (
                <section className="mt-7 hf-panel">
                  <SectionHeader
                    title="User management"
                    description="System administrator view."
                    count={users.length}
                  />

                  {users.length === 0 ? (
                    <EmptyState text="No users found." />
                  ) : (
                    <UserTable users={users} />
                  )}
                </section>
              )}
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginPage({
  email,
  password,
  loading,
  error,
  setEmail,
  setPassword,
  onSubmit,
}: {
  email: string;
  password: string;
  loading: boolean;
  error: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) {
  return (
    <main className="flex hf-page">

      <section className="hf-login-hero">
        <div className="max-w-xl">
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-300">
              HealthForecast AI
            </p>

            <h1 className="mt-3 text-4xl font-semibold leading-tight text-white">
              Clinical risk intelligence
              for hospital teams.
            </h1>
          </div>

          <p className="mt-8 max-w-lg text-base leading-7 text-slate-300">
            A secure workspace for patient data,
            readmission risk prediction and clinical
            analytics.
          </p>

          <div className="mt-12 border-t border-white/10 pt-6">
            <p className="text-sm font-medium text-white">
              Current capabilities
            </p>

            <div className="mt-5 space-y-4">
              <LoginFeature text="Role-based patient access" />
              <LoginFeature text="Readmission risk prediction" />
              <LoginFeature text="Model-derived risk drivers" />
              <LoginFeature text="Hospital forecasting" />
            </div>
          </div>
        </div>
      </section>

      <section className="hf-login-form-area">
        <div className="w-full max-w-md">

          <div className="mb-8 lg:hidden">
            <p className="text-sm font-semibold text-[#155eef]">
              HealthForecast AI
            </p>

            <h1 className="mt-2 hf-page-title">
              Clinical workspace
            </h1>
          </div>

          <div className="hf-login-card">

            <div className="border-b border-slate-200 pb-6">
              <p className="text-sm font-medium text-[#155eef]">
                Secure sign in
              </p>

              <h2 className="mt-2 hf-page-title">
                Sign in to your workspace
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use your authorized HealthForecast
                account to continue.
              </p>
            </div>

            <form
              onSubmit={onSubmit}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  className="hf-input"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  className="hf-input"
                  required
                />
              </div>

              {error && (
                <div className="border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full hf-button hf-button-primary w-full disabled:opacity-50"
              >
                {loading
                  ? 'Signing in...'
                  : 'Sign in'}
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

function Sidebar({
  currentPage,
  role,
}: {
  currentPage: string;
  role: string;
}) {
  return (
    <>
      <aside className="hf-sidebar">
        <div className="hf-sidebar-inner">
          <div className="hf-sidebar-brand">
            <p>HealthForecast</p>
            <p>Clinical workspace</p>
          </div>
          <nav className="hf-sidebar-nav">
            <NavItem href="/" label="Overview" active={currentPage === 'overview'} />
            <NavItem href="/risk" label="Risk prediction" active={currentPage === 'risk'} />
            <NavItem href="/analytics" label="Healthcare analytics" active={currentPage === 'analytics'} />
          </nav>
          <div className="hf-sidebar-footer">
            <p>Signed in as</p>
            <p>{formatRole(role)}</p>
          </div>
        </div>
      </aside>
      <nav className="hf-mobile-nav" aria-label="Primary navigation">
        <Link href="/" className={currentPage === 'overview' ? 'active' : ''}>Overview</Link>
        <Link href="/risk" className={currentPage === 'risk' ? 'active' : ''}>Risk prediction</Link>
        <Link href="/analytics" className={currentPage === 'analytics' ? 'active' : ''}>Analytics</Link>
      </nav>
    </>
  );
}

function NavItem({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link href={href} className={`hf-nav-item ${active ? 'hf-nav-active' : ''}`}>
      {label}
    </Link>
  );
}

function Header({
  currentUser,
  onLogout,
}: {
  currentUser: {
    subject: string;
    role: string;
  };
  onLogout: () => void;
}) {
  return (
    <header className="hf-header">
      <div className="flex h-[72px] items-center justify-between px-6">

        <div>
          <p className="hf-header-eyebrow">
            Hospital operations
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            Patient management and clinical analytics
          </p>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">
              {formatRole(currentUser.role)}
            </p>

            <p className="text-xs text-slate-500">
              User ID {currentUser.subject}
            </p>
          </div>

          <button
            onClick={onLogout}
            className="hf-button hf-button-secondary"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white hf-kpi">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 hf-page-title">
        {value}
      </p>
    </div>
  );
}

function Feature({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="hf-kpi">
      <p className="text-sm font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between hf-section-head">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <span className="text-sm text-slate-500">
        {count} records
      </span>
    </div>
  );
}

function PatientTable({
  patients,
}: {
  patients: Patient[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead className="bg-slate-50">
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
            <tr
              key={patient.id}
              className="hf-table-row"
            >
              <td className="px-5 py-4 text-sm font-medium text-[#155eef]">
                {patient.medical_record_number}
              </td>

              <td className="px-5 py-4 text-sm text-slate-600">
                {patient.age_group ?? 'Not recorded'}
              </td>

              <td className="px-5 py-4 text-sm text-slate-600">
                {patient.gender ?? 'Not recorded'}
              </td>

              <td className="px-5 py-4 text-sm text-slate-700">
                {patient.primary_diagnosis ??
                  'Not recorded'}
              </td>

              <td className="px-5 py-4 text-sm text-slate-600">
                {patient.assigned_doctor_id ??
                  'Unassigned'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserTable({
  users,
}: {
  users: User[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-slate-50">
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
            <tr
              key={user.id}
              className="hf-table-row"
            >
              <td className="px-5 py-4 text-sm font-medium text-slate-800">
                {user.full_name}
              </td>

              <td className="px-5 py-4 text-sm text-slate-600">
                {user.email}
              </td>

              <td className="px-5 py-4 text-sm capitalize text-slate-600">
                {formatRole(user.role)}
              </td>

              <td className="px-5 py-4 text-sm text-slate-600">
                {user.department ?? 'Not assigned'}
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  label={
                    user.is_active
                      ? 'Active'
                      : 'Inactive'
                  }
                  type={
                    user.is_active
                      ? 'success'
                      : 'neutral'
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="hf-table-head">
      {children}
    </th>
  );
}

function StatusBadge({
  label,
  type,
}: {
  label: string;
  type:
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';
}) {
  const styles = {
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning:
      'bg-amber-50 text-amber-700 border-amber-200',
    danger:
      'bg-red-50 text-red-700 border-red-200',
    neutral:
      'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <span
      className={`inline-flex border px-2 py-1 text-xs font-medium ${styles[type]}`}
    >
      {label}
    </span>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function LoginFeature({
  text,
}: {
  text: string;
}) {
  return (
    <div className="border-l-2 border-slate-600 pl-3">
      <p className="text-sm text-slate-300">
        {text}
      </p>
    </div>
  );
}

function formatRole(role: string) {
  return role
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}