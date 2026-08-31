import { apiClient } from './axios';
import { AuthTokens, LoginPayload, RefreshTokenPayload, UserProfile } from '@/types';

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/login', payload);
    return data;
  },

  refresh: async (payload: RefreshTokenPayload): Promise<AuthTokens> => {
    const { data } = await apiClient.post<AuthTokens>('/auth/refresh', payload);
    return data;
  },

  getMe: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get<UserProfile>('/auth/me');
    return data;
  },

  register: async (payload: {
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    role_name?: string;
  }): Promise<UserProfile> => {
    const { data } = await apiClient.post<UserProfile>('/auth/register', payload);
    return data;
  },

  logout: async (): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>('/auth/logout');
    return data;
  },
};

