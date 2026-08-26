import apiClient from './api';
import { mockUsers } from '../data/mockData';

// Simulated delay helper
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  login: async (email, password) => {
    await delay(600); // Simulate network latency
    
    // Find mock user
    const user = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      throw new Error('Invalid email or password. Use: doctor@healthforecast.ai / password123, admin@healthforecast.ai / password123, researcher@healthforecast.ai / password123, or sysadmin@healthforecast.ai / password123');
    }

    // Generate mock token
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockToken_for_${user.role}_only`;
    
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event('auth-status-change'));
    
    return { token: mockToken, user };
  },

  logout: async () => {
    await delay(300);
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

  // Future backend check endpoint placeholder
  verifySession: async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  }
};
