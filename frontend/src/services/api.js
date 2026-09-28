import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5204/api';

// ─────────────────────────────────────────────────────────────────
// JWT DIAGNOSTIC HELPER
// Decodes the JWT payload (base64) without verifying signature.
// Used ONLY for console diagnostics — never trust client-side decoded JWT for security.
// ─────────────────────────────────────────────────────────────────
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getTokenDiagnostics() {
  const token = localStorage.getItem('eduflow_token');
  const userRaw = localStorage.getItem('eduflow_user');

  if (!token) {
    return { present: false, reason: '❌ No token in localStorage (eduflow_token is null/missing)' };
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return { present: true, valid: false, reason: '❌ Token found but could not be decoded (malformed JWT)' };
  }

  const expMs = payload.exp ? payload.exp * 1000 : null;
  const isExpired = expMs ? Date.now() > expMs : false;
  const expiresAt = expMs ? new Date(expMs).toISOString() : 'unknown';

  const role =
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    payload['role'] ||
    payload['roles'] ||
    payload['Role'] ||
    'unknown';

  const email =
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
    payload['email'] ||
    payload['sub'] ||
    'unknown';

  let storedUser = null;
  try { storedUser = userRaw ? JSON.parse(userRaw) : null; } catch { /* ignore */ }

  return {
    present: true,
    valid: !isExpired,
    isExpired,
    expiresAt,
    role,
    email,
    storedUser,
    reason: isExpired
      ? `❌ Token EXPIRED at ${expiresAt} (now is ${new Date().toISOString()})`
      : `✅ Token valid until ${expiresAt}`,
  };
}

// ─────────────────────────────────────────────────────────────────
// GLOBAL ERROR EVENT DISPATCHER
// Dispatches a 'eduflow:api_error' CustomEvent on window so that
// any component (ErrorModal, toast system, etc.) can react.
// ─────────────────────────────────────────────────────────────────
function dispatchApiError(detail) {
  window.dispatchEvent(new CustomEvent('eduflow:api_error', { detail }));
}

// ─────────────────────────────────────────────────────────────────
// AXIOS INSTANCE
// ─────────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// ─────────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR — Logs every outgoing request with token state
// ─────────────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eduflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = config.method?.toUpperCase() ?? 'UNKNOWN';
    const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
    const tokenDiag = getTokenDiagnostics();

    console.groupCollapsed(
      `%c[EduFlow API] 📤 ${method} ${config.url}`,
      'color: #4f9ef5; font-weight: bold;'
    );
    console.log('Full URL:', url);
    console.log('Method:', method);
    console.log('Payload:', config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : '(none)');
    console.log('Params:', config.params ?? '(none)');
    console.log('Token State:', tokenDiag.reason);
    if (tokenDiag.present && tokenDiag.valid) {
      console.log('  Role:', tokenDiag.role);
      console.log('  Email:', tokenDiag.email);
      console.log('  Expires:', tokenDiag.expiresAt);
    }
    if (!tokenDiag.present) {
      console.warn('  ⚠️ No auth token — this request will fail if the endpoint requires authorization.');
    }
    console.groupEnd();

    return config;
  },
  (error) => {
    console.error('[EduFlow API] ❌ Request Setup Error (before sending):', error);
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR — Logs every response and builds friendly errors
// ─────────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase() ?? 'UNKNOWN';
    console.groupCollapsed(
      `%c[EduFlow API] ✅ ${method} ${response.config.url} — ${response.status}`,
      'color: #4caf50; font-weight: bold;'
    );
    console.log('Status:', response.status, response.statusText);
    console.log('Response Data:', response.data);
    console.groupEnd();
    return response;
  },
  (error) => {
    const config = error.config ?? {};
    const method = config.method?.toUpperCase() ?? 'UNKNOWN';
    const url = config.url ?? 'unknown endpoint';
    const fullUrl = `${config.baseURL ?? ''}${url}`;
    const status = error.response?.status;
    const responseData = error.response?.data;
    const tokenDiag = getTokenDiagnostics();

    // ── Build a structured diagnostic object ──
    const diagnostic = {
      method,
      url,
      fullUrl,
      status,
      statusText: error.response?.statusText ?? 'Network Error',
      responseBody: responseData,
      rawErrorMessage: error.message,
      tokenState: tokenDiag,
      timestamp: new Date().toISOString(),
    };

    // ── Determine friendly message ──
    let friendlyMessage = 'An unexpected error occurred. Please check your connection and try again.';
    let errorCode = 'UNKNOWN_ERROR';
    let actionableSteps = ['Refresh the page and try again.'];

    if (error.response) {
      console.groupCollapsed(
        `%c[EduFlow API] ❌ ${method} ${url} — HTTP ${status}`,
        'color: #f44336; font-weight: bold;'
      );
      console.log('━━━━━━━━━━━━ REQUEST INFO ━━━━━━━━━━━━');
      console.log('Full URL:', fullUrl);
      console.log('Method:', method);
      console.log('Sent Payload:', config.data ? JSON.parse(config.data) : '(none)');

      console.log('━━━━━━━━━━━━ AUTH / TOKEN INFO ━━━━━━━━━━━━');
      console.log('Token Present:', tokenDiag.present);
      console.log('Token Status:', tokenDiag.reason);
      if (tokenDiag.present) {
        console.log('User Role:', tokenDiag.role);
        console.log('User Email:', tokenDiag.email);
        console.log('Token Expires:', tokenDiag.expiresAt);
      }

      console.log('━━━━━━━━━━━━ RESPONSE ━━━━━━━━━━━━');
      console.log('Status Code:', status);
      console.log('Status Text:', error.response.statusText);
      console.log('Response Body:', responseData);
      console.log('Response Headers:', Object.fromEntries(
        Object.entries(error.response.headers ?? {})
      ));

      if (status === 401) {
        errorCode = 'UNAUTHORIZED_401';
        if (!tokenDiag.present) {
          friendlyMessage = `You are not logged in. The endpoint "${url}" requires authentication.\n\nPlease log in again.`;
          actionableSteps = ['Go to the login page and sign in.', 'Ensure you have an Instructor or Admin account.'];
        } else if (tokenDiag.isExpired) {
          friendlyMessage = `Your session has expired (expired at ${tokenDiag.expiresAt}).\n\nPlease log in again.`;
          actionableSteps = ['Click the logout button and sign in again.', 'Your session token has expired — a fresh login is required.'];
        } else {
          friendlyMessage = `Access Denied (401) for "${url}".\n\nYour current role is "${tokenDiag.role}". This action may require the "Instructor" or "Admin" role.`;
          actionableSteps = [
            `You are logged in as: ${tokenDiag.email} (Role: ${tokenDiag.role}).`,
            'If you need Instructor access, ask your administrator to update your role.',
            'Try logging out and logging in again — your token may be stale.',
          ];
        }
        console.error('🔐 401 DIAGNOSIS:', friendlyMessage);
        // Clear stale token
        localStorage.removeItem('eduflow_token');
        localStorage.removeItem('eduflow_user');
        if (window.location.pathname !== '/') {
          setTimeout(() => window.location.reload(), 2500);
        }
      } else if (status === 403) {
        errorCode = 'FORBIDDEN_403';
        friendlyMessage = `Access Forbidden (403) for "${url}".\n\nYour role ("${tokenDiag.role}") does not have permission to perform this action.`;
        actionableSteps = ['Contact your administrator to grant the required role.'];
        console.error('🔒 403 DIAGNOSIS:', friendlyMessage);
      } else if (status === 400) {
        errorCode = 'BAD_REQUEST_400';
        const serverMsg = responseData?.message || responseData?.detail || responseData?.title || 'Bad Request';
        friendlyMessage = `Bad Request (400) for "${url}".\n\nServer says: ${serverMsg}`;
        actionableSteps = ['Check the data you submitted and try again.', `Server detail: ${serverMsg}`];
      } else if (status === 404) {
        errorCode = 'NOT_FOUND_404';
        const serverMsg = responseData?.message || responseData?.detail || 'Resource not found';
        friendlyMessage = `Not Found (404) — "${url}" does not exist or the resource was not found.\n\n${serverMsg}`;
        actionableSteps = ['Verify the resource ID and try again.'];
      } else if (status === 429) {
        errorCode = 'RATE_LIMITED_429';
        friendlyMessage = responseData?.detail || responseData?.message || 'Too many requests. Please wait a moment before trying again.';
        actionableSteps = ['Wait 30–60 seconds before retrying.', 'This is usually caused by AI API rate limits (Gemini/Groq quota).'];
      } else if (status >= 500) {
        errorCode = 'SERVER_ERROR_5XX';
        const serverMsg = responseData?.message || responseData?.detail || responseData?.error || 'Internal Server Error';
        friendlyMessage = `Server Error (${status}) — the backend encountered an unexpected issue.\n\n${serverMsg}`;
        actionableSteps = ['Check the .NET backend console for error details.', 'Verify the PostgreSQL database is running.', 'Check the Python AI microservice at http://localhost:8888/health'];
      }

      console.groupEnd();
    } else {
      // Network error (no response received at all)
      errorCode = 'NETWORK_ERROR';
      friendlyMessage = `Network Error — could not reach "${fullUrl}".\n\nThe .NET backend server may be offline or not reachable.`;
      actionableSteps = [
        'Verify the backend is running at http://localhost:5204',
        'Check your network connection.',
        `Raw error: ${error.message}`,
      ];
      console.group('%c[EduFlow API] 🌐 NETWORK ERROR (No Response Received)', 'color: #ff9800; font-weight: bold;');
      console.error('Target URL:', fullUrl);
      console.error('Error:', error.message);
      console.error('This usually means:');
      console.error('  1. The .NET backend at http://localhost:5204 is NOT running');
      console.error('  2. CORS is blocking the request');
      console.error('  3. The API_BASE_URL env variable is wrong:', API_BASE_URL);
      console.groupEnd();
    }

    // Attach structured info to the error object
    error.friendlyMessage = friendlyMessage;
    error.errorCode = errorCode;
    error.actionableSteps = actionableSteps;
    error.diagnostic = diagnostic;

    // Dispatch global event so any component can react
    dispatchApiError({
      friendlyMessage,
      errorCode,
      actionableSteps,
      status,
      url,
      fullUrl,
      method,
      responseBody: responseData,
      tokenState: tokenDiag,
      timestamp: new Date().toISOString(),
    });

    return Promise.reject(error);
  }
);

export default api;
