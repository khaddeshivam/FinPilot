import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { refreshAccessToken } from '../features/auth/api/authApi';

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

// Single-flight refresh lock: multiple concurrent 401 responses all share
// the same in-flight refresh call instead of racing to issue N new tokens.
// Only one token gets issued; all callers retry with it.
let pendingRefresh: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Don't retry auth endpoints - a 401 from /auth/login is just wrong
    // credentials, not an expired token. Also prevent infinite retry loops.
    const isAuthEndpoint = original?.url?.includes('/auth/');
    const alreadyRetried = original?._retried === true;

    if (error.response?.status !== 401 || isAuthEndpoint || alreadyRetried) {
      return Promise.reject(error);
    }

    original._retried = true;

    const storedRefreshToken = useAuthStore.getState().refreshToken;
    if (!storedRefreshToken) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    try {
      // Coalesce: if a refresh is already in-flight, wait for it instead
      // of issuing a second one. Reset the lock once it settles.
      pendingRefresh ??= refreshAccessToken(storedRefreshToken)
        .then((data) => {
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
          return data.accessToken;
        })
        .finally(() => {
          pendingRefresh = null;
        });

      const newAccessToken = await pendingRefresh;
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(original);
    } catch {
      // Refresh itself failed (expired, revoked, or server error) - log out.
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }
  },
);
