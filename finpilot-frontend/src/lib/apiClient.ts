import axios from 'axios';
import {useAuthStore} from '../store/authStore';
import {isRefreshRejection, refreshAccessToken} from '../features/auth/api/authApi';
import {API_BASE_URL} from './apiConfig';

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
class StaleRefreshError extends Error {
}

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
                pendingRefresh = {token: storedRefreshToken, promise};
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

            // Log out only when the server actually rejected the refresh token
            // (400/401/403) and it's still the same session, so a concurrent new
            // login isn't evicted by a stale failure. A transient failure (5xx,
            // timeout, network error, cold start) keeps the session; the next
            // request that gets a 401 simply tries the refresh again.
            if (
                isRefreshRejection(refreshError) &&
                useAuthStore.getState().refreshToken === storedRefreshToken
            ) {
                useAuthStore.getState().logout();
            }
            return Promise.reject(error);
        }
    },
);
