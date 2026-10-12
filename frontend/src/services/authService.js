import apiClient from './api';
import { mockUsers } from '../data/mockData';

// Simulated delay helper
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// The API stores roles as snake_case (`hospital_admin`) while the route guards
// in App.jsx are written with hyphens (`hospital-admin`). Normalise once, here,
// so nothing downstream has to know which side it came from.
const toClientRole = (role) => (role || '').replace(/_/g, '-');

const toClientUser = (apiUser) => ({
  id: apiUser.id,
  email: apiUser.email,
  name: apiUser.full_name || apiUser.name,
  role: toClientRole(apiUser.role),
  department: apiUser.department,
  avatar: mockUsers.find((u) => u.email.toLowerCase() === apiUser.email?.toLowerCase())?.avatar,
  specialty: apiUser.department,
});

export const authService = {
  login: async (email, password) => {
    // 1. Authenticate against the live FastAPI backend.
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const accessToken = response.data?.access_token;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        // /auth/login only returns the token; the profile comes from /auth/me.
        const me = await apiClient.get('/auth/me');
        const user = toClientUser(me.data);
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new Event('auth-status-change'));
        return { token: accessToken, user };
      }
    } catch (apiError) {
      console.warn('[authService] Backend API login attempt failed/unreachable. Falling back to local authentication mode:', apiError.message);
      // A real rejection from the server (bad credentials, deactivated account)
      // must not be papered over by the offline mode below.
      if (apiError.response && [401, 403].includes(apiError.response.status)) {
        throw new Error(apiError.response.data?.detail || 'Invalid email or password.');
      }
    }

    // 2. Resilient fallback mode (if server is unreachable / offline)
    await delay(300);
    const defaultUser = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!defaultUser || defaultUser.password !== password) {
      throw new Error('Invalid email or password. Demo accounts: dr.reddy@healthforecast.org, admin.ops@healthforecast.org, researcher@healthforecast.org, admin@healthforecast.org / password123');
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
      if (response.data?.email) {
        const user = toClientUser(response.data);
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
    } catch (e) {
      // Fallback to local session
    }
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};
