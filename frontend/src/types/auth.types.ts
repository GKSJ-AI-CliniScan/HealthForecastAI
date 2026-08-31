export type UserRole = 'DOCTOR' | 'HOSPITAL_ADMIN' | 'RESEARCHER' | 'SYSTEM_ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  username_or_email: string;
  password: string;
}

export interface RefreshTokenPayload {
  refresh_token: string;
}
