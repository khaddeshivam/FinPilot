import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// baseURL is empty on purpose - Vite's dev proxy (vite.config.ts) forwards
// /api/* to the Spring Boot backend, so relative paths work in both dev and
// (once a reverse proxy is set up) production without a config change.
export const apiClient = axios.create({
  baseURL: '/api/v1',
});

// Attach the access token to every outgoing request automatically, so
// individual API calls never have to remember to set the header themselves.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401, the access token is dead (expired or invalid) - log out rather
// than let the app sit in a broken half-authenticated state. Refresh-token
// rotation (calling /auth/refresh transparently here) is a reasonable next
// step, but keeping this simple for now avoids masking real auth bugs
// during initial frontend development.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
