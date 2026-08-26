import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';
import { mockUsers } from '../data/mockData';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = () => {
    try {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Session retrieval error', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize or migrate user mock database to local images
    const stored = localStorage.getItem('hf_users');
    if (!stored) {
      localStorage.setItem('hf_users', JSON.stringify(mockUsers));
    } else {
      try {
        const users = JSON.parse(stored);
        let migrated = false;
        const updatedUsers = users.map(u => {
          if (u.avatar && u.avatar.includes('unsplash.com')) {
            migrated = true;
            if (u.role === 'doctor') return { ...u, avatar: '/images/1.png' };
            if (u.role === 'hospital-admin') return { ...u, avatar: '/images/2.png' };
            if (u.role === 'researcher') return { ...u, avatar: '/images/3.png' };
            if (u.role === 'system-admin') return { ...u, avatar: '/images/pp.jpg' };
          }
          return u;
        });
        if (migrated) {
          localStorage.setItem('hf_users', JSON.stringify(updatedUsers));
        }
      } catch (e) {
        localStorage.setItem('hf_users', JSON.stringify(mockUsers));
      }
    }

    // Migrate active user session if it contains unsplash urls
    const activeUser = localStorage.getItem('user');
    if (activeUser) {
      try {
        const parsed = JSON.parse(activeUser);
        if (parsed.avatar && parsed.avatar.includes('unsplash.com')) {
          if (parsed.role === 'doctor') parsed.avatar = '/images/1.png';
          if (parsed.role === 'hospital-admin') parsed.avatar = '/images/2.png';
          if (parsed.role === 'researcher') parsed.avatar = '/images/3.png';
          if (parsed.role === 'system-admin') parsed.avatar = '/images/pp.jpg';
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      } catch (e) {}
    }

    // Initial session load
    fetchSession();

    // Listen to manual changes (e.g. from axios interceptor or logging out)
    const handleAuthChange = () => {
      fetchSession();
    };

    window.addEventListener('auth-status-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-status-change', handleAuthChange);
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      return result.user;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return null;
      
      const updatedUser = { ...currentUser, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Persist to user list log
      const storedUsersStr = localStorage.getItem('hf_users');
      const usersList = storedUsersStr ? JSON.parse(storedUsersStr) : [...mockUsers];
      const index = usersList.findIndex(u => u.id === currentUser.id);
      if (index !== -1) {
        usersList[index] = { ...usersList[index], ...updates };
      } else {
        usersList.push(updatedUser);
      }
      localStorage.setItem('hf_users', JSON.stringify(usersList));
      
      setUser(updatedUser);
      window.dispatchEvent(new Event('auth-status-change'));
      return updatedUser;
    } catch (err) {
      console.error('Update profile error', err);
      throw err;
    }
  };

  const value = {
    user,
    role: user ? user.role : null,
    loading,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
