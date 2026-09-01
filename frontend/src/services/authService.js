import apiClient from './api';
import { mockUsers } from '../data/mockData';

// Simulated delay helper
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  login: async (email, password) => {
    // 1. Try authenticating with live Express Backend first
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data && response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new Event('auth-status-change'));
        return { token, user };
      }
    } catch (apiError) {
      console.warn('[authService] Backend API login attempt failed/unreachable. Falling back to local authentication mode:', apiError.message);
      // If server returned a 401 or 400 error message, rethrow it
      if (apiError.response && apiError.response.data && apiError.response.data.message) {
        throw new Error(apiError.response.data.message);
      }
    }

    // 2. Resilient fallback mode (if server is unreachable / offline)
    await delay(300);
    const defaultUser = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!defaultUser || defaultUser.password !== password) {
      throw new Error('Invalid email or password. Use: doctor@healthforecast.ai / password123, admin@healthforecast.ai / password123, researcher@healthforecast.ai / password123, or sysadmin@healthforecast.ai [System Admin Password]');
    }

    const storedUsersStr = localStorage.getItem('hf_users');
    let user = { ...defaultUser };
    if (storedUsersStr) {
      try {
        const usersList = JSON.parse(storedUsersStr);
        const customUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (customUser) {
          user.name = customUser.name || defaultUser.name;
          user.avatar = customUser.avatar || defaultUser.avatar;
        }
      } catch (e) {
        console.error('Failed to load credentials customization', e);
      }
    }

    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockToken_for_${user.role}_only`;
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event('auth-status-change'));

    return { token: mockToken, user };
  },

  logout: async () => {
    await delay(200);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-status-change'));
    return true;
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  verifySession: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data && response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data.user;
      }
    } catch (e) {
      // Fallback to local session
    }
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};
