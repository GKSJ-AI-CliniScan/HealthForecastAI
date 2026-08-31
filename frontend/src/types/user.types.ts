import { UserRole } from './auth.types';

export interface UserItem {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreatePayload {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  role_name?: UserRole;
  role_id?: string;
}

export interface UserUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  role_name?: UserRole;
  is_active?: boolean;
  password?: string;
}

export interface RoleItem {
  id: string;
  name: UserRole;
  description?: string;
  created_at: string;
}
