
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:8000/api/v1'
).replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request to ${normalizedPath} failed (${response.status})`;

    try {
      const body: unknown = await response.json();

      if (body && typeof body === 'object') {
        const errorBody = body as {
          detail?: unknown;
          message?: unknown;
        };

        if (typeof errorBody.detail === 'string') {
          message = errorBody.detail;
        } else if (typeof errorBody.message === 'string') {
          message = errorBody.message;
        } else if (Array.isArray(errorBody.detail)) {
          message = errorBody.detail
            .map((item) => {
              if (
                item &&
                typeof item === 'object' &&
                'msg' in item &&
                typeof item.msg === 'string'
              ) {
                return item.msg;
              }

              return 'Invalid request data';
            })
            .join('. ');
        }
      }
    } catch {
      // Retain the default message when the response is not JSON.
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
