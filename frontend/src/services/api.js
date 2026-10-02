import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5204/api';

/**
 * Origin of the API host (scheme + host + port, no path). Health probes live at the
 * origin (`/health`), not under `/api`, so callers derive it from here rather than
 * hard-coding another localhost URL.
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const TOKEN_KEY = 'eduflow_token';
const REFRESH_TOKEN_KEY = 'eduflow_refresh_token';
const EXPIRES_KEY = 'eduflow_token_expires_at';
const USER_KEY = 'eduflow_user';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasSession() {
  return Boolean(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY));
}

let refreshPromise = null;

/**
 * Exchanges the stored refresh token for a new access token (single-flight so
 * parallel 401s trigger exactly one refresh). Returns the new JWT or null.
 */
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      token: localStorage.getItem(TOKEN_KEY) || '',
      refreshToken
    });
    const data = response.data;
    if (!data?.token) return null;

    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    if (data.expiresAt) {
      localStorage.setItem(EXPIRES_KEY, String(new Date(data.expiresAt).getTime()));
    }

    // Keep the cached profile consistent with the server-issued identity.
    try {
      const stored = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      if (stored) {
        localStorage.setItem(USER_KEY, JSON.stringify({
          ...stored,
          userId: data.userId,
          id: data.userId,
          fullName: data.fullName,
          email: data.email,
          role: data.role
        }));
      }
    } catch {
      // Ignore malformed cached profile — it will be re-fetched from /auth/me.
    }

    return data.token;
  } catch {
    return null;
  }
}

// Request interceptor for JWT injection
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('[API Request Error]', error.message);
  return Promise.reject(error);
});

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// Response interceptor: refresh an expired session once, otherwise unify error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => original?.url?.includes(path));

    // 401 => access token missing/expired: try the refresh token before giving up.
    if (status === 401 && original && !original._retry && !isAuthEndpoint && hasSession()) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      // Refresh token revoked/expired => the session is over. Invalidate locally.
      clearSession();
      if (window.location.pathname !== '/') {
        window.location.reload();
      }
      const sessionEnded = new Error('Your session has expired. Please log in again.');
      sessionEnded.friendlyMessage = 'Your session has expired or is invalid. Please log in again.';
      return Promise.reject(sessionEnded);
    }

    console.error('[API Response Error]', error.message);
    let friendlyMessage = "An unexpected error occurred. Please check your connection and try again.";

    if (error.response) {
      console.error(`[API Response Error] Status: ${error.response.status}`);
      if (error.response.status === 401) {
        friendlyMessage = "Your session has expired or is invalid. Please log in again.";
        // Clear stale credentials; do not reload when there was never a session.
        if (hasSession()) {
          clearSession();
          if (window.location.pathname !== '/') {
            window.location.reload();
          }
        }
      } else if (error.response.status === 403) {
        // Server-side eligibility denials (not enrolled, not published, closed) carry their reason.
        friendlyMessage = error.response.data?.message || "You do not have permission to perform this action.";
      } else if (error.response.status === 409 || error.response.status === 502) {
        friendlyMessage = error.response.data?.message || "The request could not be completed in the current state.";
      } else if (error.response.status === 400 || error.response.status === 404) {
        friendlyMessage = error.response.data?.detail || error.response.data?.message || "We couldn't process that request. Please verify your information.";
      } else if (error.response.status === 429) {
        friendlyMessage = error.response.data?.detail || error.response.data?.message || "Too many requests. Please slow down and try again in a few moments.";
      } else if (error.response.status === 500) {
        friendlyMessage = error.response.data?.detail || error.response.data?.message || "Our servers are experiencing issues. Please try again later.";
      }
    } else {
      console.error('[API Response Error (Network or Timeout)]', error.message);
    }

    // Attach the friendly message to the error object so components can use it directly
    error.friendlyMessage = friendlyMessage;
    return Promise.reject(error);
  }
);

export default api;
