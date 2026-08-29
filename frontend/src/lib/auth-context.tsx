'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { auth } from '@/lib/api';
import type { SessionUser } from '@/types';

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Holds the session for the current page load.
 *
 * The token is kept in React state rather than localStorage. A token in
 * localStorage is readable by any script on the page, which for a system
 * holding patient data is a risk not worth the convenience of surviving a
 * refresh. Milestone 2 moves this to an httpOnly cookie set by the backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await auth.login(email, password);
      // /auth/me is called straight after login so the UI works from the
      // server's view of the caller's permissions, not from the token claims.
      // The display fields come from the login response, which already carries
      // the full user record.
      const identity = await auth.me(response.access_token);
      setToken(response.access_token);
      setUser({
        id: response.user.id,
        full_name: response.user.full_name,
        email: identity.email,
        role: identity.role,
        permissions: identity.permissions,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
      setToken(null);
      setUser(null);
      throw caught;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const can = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo(
    () => ({ token, user, loading, error, login, logout, can }),
    [token, user, loading, error, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
