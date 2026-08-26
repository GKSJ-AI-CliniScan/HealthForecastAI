import apiClient from './api';
import { mockUsers } from '../data/mockData';

// Simulated delay helper
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  login: async (email, password) => {
    await delay(600); // Simulate network latency
    
    // Find matching default mock user profile to check the latest password
    const defaultUser = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!defaultUser || defaultUser.password !== password) {
      throw new Error('Invalid email or password. Use: doctor@healthforecast.ai / password123, admin@healthforecast.ai / password123, researcher@healthforecast.ai / password123, or sysadmin@healthforecast.ai [System Admin Password]');
    }

    // Retrieve name and avatar customizations, but preserve latest security credentials
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
