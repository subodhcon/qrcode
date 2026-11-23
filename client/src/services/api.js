import axios from 'axios';

// Get API base URL from environment variables, fallback to relative /api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create custom axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // You can retrieve the auth token from localStorage/state here
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Automatic session expiry handling for Admin Portal
    if (error.response?.status === 401 && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login?expired=true';
      }
    }

    // Generic error handling logic
    const customError = {
      message: error.response?.data?.message || 'Something went wrong',
      status: error.response?.status || 500,
      data: error.response?.data || null,
      originalError: error,
    };

    // Log error for development
    if (import.meta.env.DEV) {
      console.error('[API Error]:', customError);
    }

    return Promise.reject(customError);
  }
);

export default api;
