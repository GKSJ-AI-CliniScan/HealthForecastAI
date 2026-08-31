import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '@/api/auth.api';
import { LoginPayload, UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('hf_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('hf_access_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const profile = await authApi.getMe();
      setUser(profile);
      localStorage.setItem('hf_user', JSON.stringify(profile));
    } catch {
      setUser(null);
      localStorage.removeItem('hf_user');
      localStorage.removeItem('hf_access_token');
      localStorage.removeItem('hf_refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const tokens = await authApi.login(payload);
      localStorage.setItem('hf_access_token', tokens.access_token);
      localStorage.setItem('hf_refresh_token', tokens.refresh_token);
      const profile = await authApi.getMe();
      setUser(profile);
      localStorage.setItem('hf_user', JSON.stringify(profile));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await authApi.logout();
      }
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      setUser(null);
      localStorage.removeItem('hf_user');
      localStorage.removeItem('hf_access_token');
      localStorage.removeItem('hf_refresh_token');
      window.location.href = '/login';
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  const refreshUserProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
