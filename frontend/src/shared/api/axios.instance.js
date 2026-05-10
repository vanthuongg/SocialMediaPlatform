import axios from 'axios';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { setupMockAdapter } from './mockAdapter.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// INITIALIZE MOCK ADAPTER HERE
// This routes all /api/v1 calls to the local browser database (mockDb)
// setupMockAdapter(api);

// Request interceptor — attach access token
api.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 and refresh token
let isRefreshing = false;
let refreshQueue = [];

// Auth endpoints that should never trigger a token refresh
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh-token', '/auth/logout'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const errMsg = error.response?.data?.error?.message || '';

    // ── Ban check: 401 with "suspended" message ───────────────────────────────
    // Check BEFORE attempting refresh — covers login and mid-session ban
    if (error.response?.status === 401 && errMsg.includes('suspended')) {
      useAuthStore.getState().logout();
      window.location.href = `/banned?error=${encodeURIComponent(errMsg)}`;
      return new Promise(() => {}); // Halt execution pipeline
    }

    // ── Ban check: 403 with "suspended" message ───────────────────────────────
    if (error.response?.status === 403 && errMsg.includes('suspended')) {
      useAuthStore.getState().logout();
      window.location.href = `/banned?error=${encodeURIComponent(errMsg)}`;
      return new Promise(() => {}); // Halt execution pipeline
    }

    // ── Token refresh flow — skip for auth endpoints ──────────────────────────
    const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => requestUrl.includes(ep));
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshUrl = import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/auth/refresh-token`
          : '/api/v1/auth/refresh-token';
        const response = await axios.post(refreshUrl, {}, { withCredentials: true });
        const { accessToken } = response.data.data;

        useAuthStore.getState().setAccessToken(accessToken);
        refreshQueue.forEach(({ resolve }) => resolve(accessToken));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach(({ reject }) => reject(refreshError));
        refreshQueue = [];
        useAuthStore.getState().logout();

        const refreshErrMsg = refreshError.response?.data?.error?.message || '';
        if (refreshErrMsg.includes('suspended')) {
          window.location.href = `/banned?error=${encodeURIComponent(refreshErrMsg)}`;
        } else {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
