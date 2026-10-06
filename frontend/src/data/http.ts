/**
 * http.ts — every backend call in the app goes through `request()`.
 *
 * WHY ONE FUNCTION: so that adding a header, changing the base URL or handling
 * an expired login is a one-line change, not a hunt through 10 service files.
 *
 * WHAT IT ADDS ON TOP OF fetch():
 *   1. base URL from config.ts
 *   2. the login token as `Authorization: Bearer …`
 *   3. a timeout (Render free tier can be slow to wake up)
 *   4. errors turned into ONE typed `ApiError` with a `kind`, so screens can
 *      show the right plain-language message (offline vs. no permission …)
 *
 * FLOWS NEXT: data/live.ts calls request(); pages catch ApiError via useData().
 */
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/config';

/** What went wrong, in terms the UI cares about (not raw HTTP codes). */
export type ApiErrorKind =
  | 'offline' // network failure / timeout / CORS block → "Cannot reach the server"
  | 'unauthorized' // 401 → login expired, send user back to sign-in
  | 'forbidden' // 403 → this role may not see this
  | 'not_found' // 404
  | 'invalid' // 400 / 422 → bad input (forms)
  | 'server'; // 5xx or anything else

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Maps an HTTP status to our small set of kinds. Exported so it can be unit-tested. */
export function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 400 || status === 422) return 'invalid';
  return 'server';
}

/**
 * The token lives in sessionStorage (cleared when the tab closes), set by
 * data/session.ts at login. Read here lazily so this file has no React deps.
 */
const TOKEN_KEY = 'hf_token';
export function readToken(): string | null {
  if (typeof window === 'undefined') return null; // server render: no session
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // storage blocked (private mode) → behave as logged out
  }
}
export function writeToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked: the session will simply not survive a reload */
  }
}

/**
 * Listeners told when the backend answers 401 (token expired/invalid).
 * session-context.tsx subscribes and logs the user out → login page.
 */
const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(fn: () => void): () => void {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}

export async function request<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = init.auth === false ? null : readToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // AbortController gives us the timeout: after REQUEST_TIMEOUT_MS the fetch is cancelled.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } catch {
    // fetch only throws for network-level problems (DNS, CORS, timeout, offline).
    throw new ApiError('offline', 'Cannot reach the server');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // FastAPI puts a human message in `detail` (string, or a list for 422).
    let message = response.statusText || `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') message = body.detail;
    } catch {
      /* body was not JSON — keep the status text */
    }
    const kind = kindForStatus(response.status);
    if (kind === 'unauthorized') unauthorizedListeners.forEach((fn) => fn());
    throw new ApiError(kind, message, response.status);
  }

  return (await response.json()) as T;
}
