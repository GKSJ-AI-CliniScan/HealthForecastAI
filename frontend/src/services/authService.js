import apiClient from './api';

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
      throw new Error(response.data?.message || 'Authentication failed');
    } catch (apiError) {
      throw new Error(apiError.response?.data?.message || 'Authentication service unavailable');
    }
  },

  logout: async () => {
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

  updateProfile: async (updates) => {
    const response = await apiClient.put('/auth/profile', updates);
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Profile update failed');
    }
    localStorage.setItem('user', JSON.stringify(response.data.user));
    window.dispatchEvent(new Event('auth-status-change'));
    return response.data.user;
  },

  verifySession: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data && response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data.user;
      }
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-status-change'));
      throw e;
    }
  }
};
