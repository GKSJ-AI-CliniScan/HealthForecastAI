import axios from 'axios';

// A hosted build from a clean clone has no .env files, so the fallback has to be
// the deployed API - defaulting to a laptop makes every deployed request call
// the visitor's own localhost and land in the mock-auth path.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://healthfor-ai.onrender.com/api/v1' : 'http://localhost:8000/api/v1');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Render's free instance sleeps after about fifteen idle minutes and the first
  // request then pays a cold start - measured 31.8s here against 0.39s warm. This
  // sits above the worst case so a sleeping server is waited out rather than
  // aborted into the mock fallback, which would show fabricated rows as real.
  timeout: 90000,
});

// /health lives at the service root, not under the API prefix. A relative base
// (VITE_API_BASE_URL=/api/v1) means the API shares this origin.
const API_ORIGIN = API_BASE_URL.startsWith('http')
  ? new URL(API_BASE_URL).origin
  : window.location.origin;

// Called on page load so the cold start overlaps with signing in and navigating
// instead of landing on a data page's spinner.
export const wakeBackend = () => fetch(`${API_ORIGIN}/health`).catch(() => {});

// Request interceptor to attach JWT token when integrated with backend
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle global errors (e.g. 401 Unauthorized, 403 Forbidden)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        // Clear tokens and credentials on auth failure
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-status-change'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
