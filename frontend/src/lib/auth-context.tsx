'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from './api';
import type { Role } from '@/types';

interface LoginResponse {
  access_token: string;
  role: Role;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  role: Role | null;
  permissions: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const STORAGE_KEY = 'hf_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as LoginResponse;
      setToken(parsed.access_token);
      setRole(parsed.role);
      setPermissions(parsed.permissions);
    }
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const result = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(result.access_token);
    setRole(result.role);
    setPermissions(result.permissions);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  }

  function logout() {
    setToken(null);
    setRole(null);
    setPermissions([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ token, role, permissions, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}