'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { auth, ApiError } from '@/lib/api';
import type { SessionUser, Role } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  token: string | null;
  user: SessionUser | null;
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  logout: () => void;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY_USER = 'hf_auth_user';
const STORAGE_KEY_TOKEN = 'hf_auth_token';

/**
 * Holds the session for the current application lifecycle.
 * Supports both frontend mock role authentication (for development/demo)
 * and real backend JWT login when backend is present.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session from sessionStorage on client mount
  useEffect(() => {
    try {
      const savedUser = sessionStorage.getItem(STORAGE_KEY_USER);
      const savedToken = sessionStorage.getItem(STORAGE_KEY_TOKEN);
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser) as SessionUser);
        setToken(savedToken);
      }
    } catch {
      // Ignore storage read errors
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const login = useCallback(async (email: string, password: string = 'HealthcareDemo2026!') => {
    setLoading(true);
    setError(null);
    try {
      let resolvedUser: SessionUser;
      let resolvedToken = 'mock-dev-token';

      // First try real backend if reachable
      try {
        const response = await auth.login(email, password);
        const identity = await auth.me(response.access_token);
        resolvedToken = response.access_token;
        resolvedUser = {
          id: response.user.id,
          full_name: response.user.full_name,
          email: identity.email,
          role: identity.role,
          department: response.user.department,
          permissions: identity.permissions,
        };
      } catch {
        // In frontend development mode with mock data, fallback to mock user
        resolvedUser = await authService.mockLogin(email);
        resolvedToken = 'mock-dev-token';
      }

      setToken(resolvedToken);
      setUser(resolvedUser);

      // Persist in sessionStorage for development/demo
      try {
        sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(resolvedUser));
        sessionStorage.setItem(STORAGE_KEY_TOKEN, resolvedToken);
      } catch {
        // Ignore storage write errors
      }
    } catch (caught) {
      let message = 'Login failed';
      if (caught instanceof ApiError && (caught.status === 401 || caught.status === 501)) {
        message = 'Invalid email or password';
      } else if (caught instanceof TypeError) {
        message = 'Unable to reach server. Using mock authentication.';
      } else if (caught instanceof Error) {
        message = caught.message;
      }
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchRole = useCallback(async (role: Role) => {
    setLoading(true);
    try {
      const mockUser = await authService.mockLogin(role);
      setUser(mockUser);
      try {
        sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockUser));
      } catch {
        // Ignore storage errors
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY_USER);
      sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const can = useCallback(
    (permission: string) => user?.permissions?.includes(permission) ?? false,
    [user],
  );

  const value = useMemo(
    () => ({ token, user, loading, isInitialized, error, login, switchRole, logout, can }),
    [token, user, loading, isInitialized, error, login, switchRole, logout, can],
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
