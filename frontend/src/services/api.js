import axios from 'axios';
import { getAuthenticationErrorMessage } from './authErrors';
import { isAiErrorCode, mapAiError } from '../utils/aiErrors';

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

let sessionVersion = 0;
export const getSessionVersion = () => sessionVersion;

export function clearSession() {
  sessionVersion++;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("eduflow-session-cleared"));
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
  const version = getSessionVersion();

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      token: localStorage.getItem(TOKEN_KEY) || '',
      refreshToken
    });
    const data = response.data;
    if (version !== getSessionVersion() || localStorage.getItem(REFRESH_TOKEN_KEY) !== refreshToken) return null;
    if (!data?.token || !data.refreshToken || !data.userId || !['Student', 'Instructor', 'Admin'].includes(data.role)) return null;

    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    if (data.expiresAt) {
      localStorage.setItem(EXPIRES_KEY, String(new Date(data.expiresAt).getTime()));
    }

    const profile = { userId: data.userId, id: data.userId, fullName: data.fullName, email: data.email, role: data.role, isActive: true };
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('eduflow-session-updated', { detail: profile }));

    return data.token;
  } catch {
    return null;
  }
}

// Request interceptor for JWT injection
api.interceptors.request.use((config) => {
  config._sessionVersion = getSessionVersion();
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && !AUTH_ENDPOINTS.some(path => config.url?.includes(path))) {
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

    if (!isAuthEndpoint && original?._sessionVersion !== getSessionVersion()) return Promise.reject(error);

    if (isAuthEndpoint) {
      error.friendlyMessage = getAuthenticationErrorMessage(error);
      return Promise.reject(error);
    }

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

      if (original._sessionVersion !== getSessionVersion()) return Promise.reject(error);

      // Refresh token revoked/expired => the session is over. Invalidate locally.
      clearSession();
      const sessionEnded = new Error('Your session has expired. Please log in again.');
      sessionEnded.friendlyMessage = 'Your session has expired or is invalid. Please log in again.';
      return Promise.reject(sessionEnded);
    }

    console.error('[API Response Error]', error.message);
    let friendlyMessage = "The service is unavailable. We cannot reach the API. Please try again later.";

    if (error.response) {
      console.error(`[API Response Error] Status: ${error.response.status}`);
      // AI pipeline failures carry a stable code (AI_*, RAG_*, DOCUMENT_*, QUIZ_*)
      // with user-facing copy and a correlation reference — map those first so
      // components never render raw technical errors.
      if (isAiErrorCode(error.response.data?.code)) {
        error.aiError = mapAiError(error);
        friendlyMessage = error.aiError.message;
      } else if (error.response.status === 401) {
        friendlyMessage = "Your session has expired or is invalid. Please log in again.";
        // Clear stale credentials and let the React route guard handle sign-out.
        if (hasSession()) {
          clearSession();
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

    // Only trigger the global error pop-up if explicitly requested by caller (showGlobalError: true)
    // and not explicitly suppressed. Handled errors and standard 404s will not trigger unwanted pop-ups,
    // while unhandled promise rejections are caught cleanly by App.jsx.
    if (typeof window !== 'undefined' && original?.showGlobalError && !original?.skipGlobalError && !original?.suppressGlobalError) {
      window.dispatchEvent(new CustomEvent('eduflow-global-error', {
        detail: {
          title: error.response?.status ? `Request Error (${error.response.status})` : 'Network Error',
          message: friendlyMessage,
          code: error.response?.data?.code || error.code || `HTTP_${error.response?.status || 'FAIL'}`,
          details: error.response?.data?.details || error.response?.data?.detail || ''
        }
      }));
    }

    return Promise.reject(error);
  }
);

export default api;
