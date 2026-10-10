'use client';
/**
 * session.tsx — who is signed in, for the whole app.
 *
 * WHY NEW (instead of the old lib/auth-context.tsx): the old one silently fell
 * back to a mock user when the real login failed, so you could not tell if you
 * were really connected. Here a failed login is a failed login (live mode).
 * The old file is left untouched because the previous components still import it.
 *
 * Storage: token + user in sessionStorage (cleared when the tab closes — safer
 * on shared hospital computers than localStorage).
 * FLOWS NEXT: AppShell/RequireRole read `user`; login page calls login();
 * http.ts tells us about 401s and we log out → back to /login.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { data, type SessionUser } from '@/data';
import { onUnauthorized, writeToken } from '@/data/http';

const USER_KEY = 'hf_user';

interface SessionState {
  user: SessionUser | null;
  /** false until we have checked storage — prevents a flash-redirect to /login on reload. */
  ready: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // Restore after a page reload.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(USER_KEY);
      if (raw) setUser(JSON.parse(raw) as SessionUser);
    } catch {
      /* corrupt or blocked storage → treat as signed out */
    }
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    try {
      window.sessionStorage.removeItem(USER_KEY);
    } catch {
      /* nothing to clear */
    }
    setUser(null);
  }, []);

  // Expired/invalid token anywhere in the app → sign out (RequireRole then shows login).
  useEffect(() => onUnauthorized(logout), [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await data.login(email.trim(), password); // throws ApiError on failure
    writeToken(token);
    try {
      window.sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* session will not survive reload, but works now */
    }
    setUser(u);
    return u;
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
