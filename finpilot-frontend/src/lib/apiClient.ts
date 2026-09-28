import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { refreshAccessToken } from '../features/auth/api/authApi';

// baseURL is empty on purpose - Vite's dev proxy (vite.config.ts) forwards
// /api/* to the Spring Boot backend, so relative paths work in both dev and
// (once a reverse proxy is set up) production without a config change.
const API_BASE_URL =
  import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

// Sentinel error used to distinguish a superseded refresh from a real failure.
// When the session that started a refresh is no longer active (logged out or
// replaced by a new login), we throw this so the catch block can reject
// without touching the current (newer) session.
class StaleRefreshError extends Error {}

// Track the in-flight refresh together with the refresh token that started it.
// This prevents two race conditions in the naive single-Promise approach:
//   1. Logout-undone: a refresh resolves after logout and calls setTokens,
//      restoring an authenticated session the user just ended.
//   2. Session-leak: a fresh login awaits the old session's refresh promise
//      and ends up with the old session's new access token.
let pendingRefresh: { token: string; promise: Promise<string> } | null = null;

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
      // Share an in-flight refresh only if it was started by this same token.
      // A different token (new session or rotated token) gets its own request.
      if (!pendingRefresh || pendingRefresh.token !== storedRefreshToken) {
        const promise: Promise<string> = refreshAccessToken(storedRefreshToken)
          .then((data) => {
            // Apply the result only if the session still uses the token that
            // started this refresh (not logged out, not replaced by a new login).
            if (useAuthStore.getState().refreshToken !== storedRefreshToken) {
              throw new StaleRefreshError();
            }
            useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
            return data.accessToken;
          })
          .finally(() => {
            if (pendingRefresh?.promise === promise) pendingRefresh = null;
          });
        pendingRefresh = { token: storedRefreshToken, promise };
      }

      const newAccessToken = await pendingRefresh.promise;

      // Session may have ended while we waited; don't retry into a dead session.
      if (!useAuthStore.getState().isAuthenticated) {
        return Promise.reject(error);
      }

      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      if (refreshError instanceof StaleRefreshError) {
        // Superseded refresh: the user logged out or logged in again while this
        // refresh was in flight. Reject without retrying and don't touch the
        // current (newer) session.
        return Promise.reject(error);
      }
      // Real refresh failure: log out only if it's still the same session,
      // so a concurrent new login isn't evicted by a stale failure.
      if (useAuthStore.getState().refreshToken === storedRefreshToken) {
        useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }
  },
);
