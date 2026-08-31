import { apiClient } from './axios';
import { PaginatedResponse, UserCreatePayload, UserItem, UserUpdatePayload } from '@/types';

export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: string;
}

export const usersApi = {
  listUsers: async (params?: UserListParams): Promise<PaginatedResponse<UserItem>> => {
    const { data } = await apiClient.get<PaginatedResponse<UserItem>>('/users', {
      params,
    });
    return data;
  },

  listDoctors: async (): Promise<UserItem[]> => {
    const { data } = await apiClient.get<UserItem[]>('/users/doctors');
    return data;
  },

  getUser: async (id: string): Promise<UserItem> => {
    const { data } = await apiClient.get<UserItem>(`/users/${id}`);
    return data;
  },

  createUser: async (payload: UserCreatePayload): Promise<UserItem> => {
    const { data } = await apiClient.post<UserItem>('/users', payload);
    return data;
  },

  updateUser: async (id: string, payload: UserUpdatePayload): Promise<UserItem> => {
    const { data } = await apiClient.put<UserItem>(`/users/${id}`, payload);
    return data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
