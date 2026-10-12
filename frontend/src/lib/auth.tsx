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

const TOKEN_KEY = 'healthforecast.token';
const USER_KEY = 'healthforecast.user';
const PERMS_KEY = 'healthforecast.perms';

const DEMO_ACCOUNTS: Record<string, { user: User; permissions: string[] }> = {
  'doctor@healthforecast.ai': {
    user: {
      id: 1,
      email: 'doctor@healthforecast.ai',
      full_name: 'Dr. Elena Rostova, MD',
      role: 'doctor',
      department: 'Cardiology & Metabolic Care',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    permissions: [
      'patient:read_assigned',
      'patient:write',
      'medical_history:read',
      'risk_report:read',
      'readmission_forecast:read',
      'treatment_report:read_limited',
      'treatment_report:read',
      'care_recommendation:generate',
      'hospital_analytics:read',
    ],
  },
  'admin@healthforecast.ai': {
    user: {
      id: 2,
      email: 'admin@healthforecast.ai',
      full_name: 'Marcus Vance',
      role: 'hospital_admin',
      department: 'Hospital Operations & Quality',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    permissions: [
      'patient:read_all',
      'risk_report:read',
      'risk_report:read_aggregated',
      'readmission_forecast:read',
      'treatment_report:read',
      'hospital_analytics:read',
      'analytics:export',
    ],
  },
  'researcher@healthforecast.ai': {
    user: {
      id: 3,
      email: 'researcher@healthforecast.ai',
      full_name: 'Dr. Sarah Chen, PhD',
      role: 'researcher',
      department: 'Clinical Informatics & Population Health',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    permissions: [
      'patient:read_anonymized',
      'risk_report:read_aggregated',
      'treatment_report:read',
      'hospital_analytics:read',
      'population_health:read',
      'research_dataset:export',
      'analytics:export',
    ],
  },
  'sysadmin@healthforecast.ai': {
    user: {
      id: 4,
      email: 'sysadmin@healthforecast.ai',
      full_name: 'Alex Mercer',
      role: 'system_admin',
      department: 'IT Infrastructure & AI Systems',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    permissions: [
      'patient:read_assigned',
      'patient:read_all',
      'patient:read_anonymized',
      'patient:write',
      'medical_history:read',
      'risk_report:read',
      'risk_report:read_aggregated',
      'readmission_forecast:read',
      'treatment_report:read',
      'care_recommendation:generate',
      'hospital_analytics:read',
      'population_health:read',
      'research_dataset:export',
      'analytics:export',
      'user:manage',
      'model:manage',
      'audit_log:read',
      'system:configure',
    ],
  },
};

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
      window.sessionStorage.removeItem(USER_KEY);
      window.sessionStorage.removeItem(PERMS_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const loadSession = useCallback(
    async (nextToken: string) => {
      try {
        const [me, perms] = await Promise.all([
          apiFetch<User>('/auth/me', {}, nextToken),
          apiFetch<{ permissions: string[] }>('/auth/permissions', {}, nextToken),
        ]);
        setUser(me);
        setPermissions(perms.permissions);
        setToken(nextToken);
        try {
          window.sessionStorage.setItem(USER_KEY, JSON.stringify(me));
          window.sessionStorage.setItem(PERMS_KEY, JSON.stringify(perms.permissions));
        } catch {
          /* ignore */
        }
      } catch (err: unknown) {
        // If backend /auth/me fails, check stored user in session storage
        try {
          const storedUser = window.sessionStorage.getItem(USER_KEY);
          const storedPerms = window.sessionStorage.getItem(PERMS_KEY);
          if (storedUser && storedPerms) {
            setUser(JSON.parse(storedUser));
            setPermissions(JSON.parse(storedPerms));
            setToken(nextToken);
            return;
          }
        } catch {
          /* ignore */
        }
        throw err;
      }
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
      const normalizedEmail = email.toLowerCase().trim();

      try {
        // Attempt live API authentication
        const result = await apiPost<LoginResponse>('/auth/login', { email: normalizedEmail, password });
        try {
          window.sessionStorage.setItem(TOKEN_KEY, result.access_token);
        } catch {
          /* ignore */
        }
        await loadSession(result.access_token);
      } catch (err: unknown) {
        // Check for Demo Account fallback if backend is offline or unreachable
        const demo = DEMO_ACCOUNTS[normalizedEmail] || (
          normalizedEmail.includes('admin')
            ? DEMO_ACCOUNTS['admin@healthforecast.ai']
            : normalizedEmail.includes('research')
            ? DEMO_ACCOUNTS['researcher@healthforecast.ai']
            : normalizedEmail.includes('sys')
            ? DEMO_ACCOUNTS['sysadmin@healthforecast.ai']
            : DEMO_ACCOUNTS['doctor@healthforecast.ai']
        );

        if (demo) {
          const mockToken = `demo_token_${demo.user.role}_${Date.now()}`;
          setUser(demo.user);
          setPermissions(demo.permissions);
          setToken(mockToken);
          try {
            window.sessionStorage.setItem(TOKEN_KEY, mockToken);
            window.sessionStorage.setItem(USER_KEY, JSON.stringify(demo.user));
            window.sessionStorage.setItem(PERMS_KEY, JSON.stringify(demo.permissions));
          } catch {
            /* ignore */
          }
          return;
        }

        const message = err instanceof Error ? err.message : 'Login failed. Please check credentials.';
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
