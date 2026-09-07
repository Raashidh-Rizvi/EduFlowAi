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
      if (error.response.status === 400 || error.response.status === 401 || error.response.status === 404) {
        friendlyMessage = error.response.data?.message || "We couldn't process that request. Please verify your information.";
      } else if (error.response.status === 500) {
        friendlyMessage = error.response.data?.message || "Our servers are experiencing issues. Please try again later.";
      }
    }
    
    // Attach the friendly message to the error object so components can use it directly
    error.friendlyMessage = friendlyMessage;
    return Promise.reject(error);
  }
);

export default api;
