import type {
  CallerIdentity,
  DashboardStats,
  LoginResponse,
  Patient,
  PatientDetail,
  RoleInfo,
} from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Thin fetch wrapper for the FastAPI backend.
 * Never store the access token in localStorage - use an httpOnly cookie.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    // FastAPI puts the reason in `detail`; fall back to the status text when the
    // body is not JSON, so the UI never shows "[object Object]".
    let message = response.statusText || `Request to ${path} failed`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body?.detail) {
        message = body.detail;
      }
    } catch {
      // Response had no JSON body; keep the status text.
    }
    throw new ApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export const auth = {
  login(email: string, password: string): Promise<LoginResponse> {
    return apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  me(token: string): Promise<CallerIdentity> {
    return apiFetch<CallerIdentity>('/auth/me', {}, token);
  },

  roles(): Promise<RoleInfo[]> {
    return apiFetch<RoleInfo[]>('/auth/roles');
  },
};

export const patients = {
  stats(token: string): Promise<DashboardStats> {
    return apiFetch<DashboardStats>('/patients/stats', {}, token);
  },

  list(token: string, limit = 50, offset = 0): Promise<Patient[]> {
    return apiFetch<Patient[]>(`/patients?limit=${limit}&offset=${offset}`, {}, token);
  },

  detail(token: string, patientId: number): Promise<PatientDetail> {
    return apiFetch<PatientDetail>(`/patients/${patientId}`, {}, token);
  },

  anonymised(token: string, limit = 100): Promise<Patient[]> {
    return apiFetch<Patient[]>(`/patients/anonymised?limit=${limit}`, {}, token);
  },
};
