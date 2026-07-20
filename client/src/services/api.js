import axios from 'axios';

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.example.com/v1';

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
