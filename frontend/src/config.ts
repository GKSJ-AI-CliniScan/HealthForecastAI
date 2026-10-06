/**
 * config.ts — the ONLY two settings someone needs to change to move this
 * frontend to a new backend. (Samarth's ask: "easily migrate ho jaye".)
 *
 * WHY: before this file, the backend address was guessed from the page's own
 * hostname (`window.location.hostname:8000`). That works on a laptop but breaks
 * the moment frontend and backend live on different hosts (e.g. Render). Now
 * the address comes from one environment variable, baked in at build time.
 *
 * FLOWS NEXT: data/http.ts reads API_BASE_URL for every request;
 * data/index.ts reads DATA_MODE to choose live backend vs sample data.
 */

/**
 * Backend base URL including the /api/v1 prefix (FastAPI's API_V1_PREFIX).
 *   Local:      http://localhost:8000/api/v1   (default)
 *   Deployed:   https://healthforecast-backend-i8kb.onrender.com/api/v1
 * Set it in frontend/.env.local or as a build arg (see frontend/.env.example).
 * Trailing slash is stripped so `${API_BASE_URL}/patients` never becomes `//patients`.
 */
export const API_BASE_URL: string = (
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1'
).replace(/\/+$/, '');

/**
 * 'live' (default) — every screen fetches from the backend. If the backend has
 *                    no data or is down, the screen SAYS so. It never quietly
 *                    swaps in invented numbers (this is a hospital tool).
 * 'demo'           — uses the team's sample data (Kiruthika's mock files) with a
 *                    visible "sample data" banner. For presentations without a
 *                    running backend only.
 */
export type DataMode = 'live' | 'demo';
export const DATA_MODE: DataMode = process.env.NEXT_PUBLIC_DATA_MODE === 'demo' ? 'demo' : 'live';

/** How long to wait for the backend before telling the user it is unreachable.
 *  Render's free tier sleeps and can take ~50 s to wake, so this is generous. */
export const REQUEST_TIMEOUT_MS = 60_000;
