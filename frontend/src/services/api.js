import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5204/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for JWT injection
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eduflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let friendlyMessage = "An unexpected error occurred. Please check your connection and try again.";
    
    if (error.response) {
      if (error.response.status === 401) {
        friendlyMessage = "Your session has expired or is invalid. Please log in again.";
        // Clear stale token
        localStorage.removeItem('eduflow_token');
        localStorage.removeItem('eduflow_user');
        
        // Only reload if we aren't already on the login page to prevent loops
        if (window.location.pathname !== '/') {
           window.location.reload();
        }
      } else if (error.response.status === 400 || error.response.status === 404) {
        friendlyMessage = error.response.data?.detail || error.response.data?.message || "We couldn't process that request. Please verify your information.";
      } else if (error.response.status === 429) {
        friendlyMessage = error.response.data?.detail || error.response.data?.message || "Too many requests. Please slow down and try again in a few moments.";
      } else if (error.response.status === 500) {
        friendlyMessage = error.response.data?.detail || error.response.data?.message || "Our servers are experiencing issues. Please try again later.";
      }
    }
    
    // Attach the friendly message to the error object so components can use it directly
    error.friendlyMessage = friendlyMessage;
    return Promise.reject(error);
  }
);

export default api;
