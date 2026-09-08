'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, apiPost } from '@/lib/api';
import type { LoginResponse, Role, User } from '@/types';

/**
 * Session storage, not localStorage: the token is cleared when the tab closes,
 * and it is never attached to a request automatically, so there is no CSRF
 * surface. It is still readable by any script on the page, so an XSS bug would
 * expose it. Moving to an httpOnly cookie set by the backend is the Milestone 4
 * hardening task - see docs/07-testing/README.md.
 */
const TOKEN_KEY = 'healthforecast.token';

interface AuthState {
  token: string | null;
  user: User | null;
  permissions: string[];
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission: string) => boolean;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    try {
      window.sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable - the in-memory state is already cleared */
    }
  }, []);

  const loadSession = useCallback(
    async (nextToken: string) => {
      const [me, perms] = await Promise.all([
        apiFetch<User>('/auth/me', {}, nextToken),
        apiFetch<{ permissions: string[] }>('/auth/permissions', {}, nextToken),
      ]);
      setUser(me);
      setPermissions(perms.permissions);
      setToken(nextToken);
    },
    [],
  );

  // Restore a session on first paint so a refresh does not log the user out.
  useEffect(() => {
    const stored = readStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    loadSession(stored)
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [loadSession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const result = await apiPost<LoginResponse>('/auth/login', { email, password });
        try {
          window.sessionStorage.setItem(TOKEN_KEY, result.access_token);
        } catch {
          /* storage blocked - the session still works until the page reloads */
        }
        await loadSession(result.access_token);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        throw err;
      }
    },
    [loadSession],
  );

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      permissions,
      loading,
      error,
      login,
      logout: clearSession,
      can: (permission: string) => permissions.includes(permission),
      hasRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    }),
    [token, user, permissions, loading, error, login, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
