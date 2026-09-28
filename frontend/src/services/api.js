import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5204/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Request interceptor for JWT injection
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eduflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
}, (error) => {
  console.error('[API Request Error]', error.message);
  return Promise.reject(error);
});

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error.message);
    let friendlyMessage = "An unexpected error occurred. Please check your connection and try again.";
    
    if (error.response) {
      console.error(`[API Response Error] Status: ${error.response.status}`);
      if (error.response.status === 401) {
        friendlyMessage = "Your session has expired or is invalid. Please log in again.";
        // Clear stale token
        localStorage.removeItem('eduflow_token');
        localStorage.removeItem('eduflow_user');
        
        // Only reload if we aren't already on the login page to prevent loops
        if (window.location.pathname !== '/') {
           window.location.reload();
        }
      } else if (error.response.status === 403) {
        friendlyMessage = "You do not have permission to perform this action.";
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
