'use client';

import { useState } from 'react';
import type { LoginResponse } from '@/types';
import { Dashboard } from './Dashboard';
import { LoginForm } from './LoginForm';

/** Holds the session in memory and switches between the login form and the dashboard. */
export function DashboardShell() {
  const [session, setSession] = useState<LoginResponse | null>(null);

  return session ? (
    <Dashboard session={session} onLogout={() => setSession(null)} />
  ) : (
    <LoginForm onLogin={setSession} />
  );
}
