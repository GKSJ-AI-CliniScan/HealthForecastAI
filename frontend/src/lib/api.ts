const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  readonly status: number;
  /** The backend's `detail` field, when the error response carried one. */
  readonly detail: unknown;

  constructor(status: number, message: string, detail: unknown = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function readDetail(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'detail' in body) {
      return (body as { detail: unknown }).detail;
    }
  } catch {
    // Not JSON - no detail to report.
  }
  return undefined;
}

/**
 * Send a request to the backend and return the raw response, or throw ApiError.
 *
 * Use this when the caller needs headers (X-Total-Count), a non-JSON body (a
 * report file) or has no body at all (204). Never store the access token in
 * localStorage - it is read server-side from an httpOnly cookie.
 */
export async function apiRequest(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed`, await readDetail(response));
  }
  return response;
}

/** Thin JSON fetch wrapper for the FastAPI backend. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await apiRequest(path, options, token);
  return (await response.json()) as T;
}

/** A JSON list endpoint plus the X-Total-Count header it reports. */
export async function apiFetchPage<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<{ items: T[]; total: number }> {
  const response = await apiRequest(path, options, token);
  const items = (await response.json()) as T[];
  const header = Number(response.headers.get('X-Total-Count'));
  return { items, total: Number.isFinite(header) && header > 0 ? header : items.length };
}
