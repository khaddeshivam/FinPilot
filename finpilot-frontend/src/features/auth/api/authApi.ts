import axios, { isAxiosError } from 'axios';
import { apiClient } from '../../../lib/apiClient';
import { API_BASE_URL } from '../../../lib/apiConfig';
// These types mirror the backend's RegisterRequest/LoginRequest/AuthResponse/
// UserResponse DTOs exactly (identity/dto/*.java) - keeping them in sync by
// hand for now; codegen from the OpenAPI spec is a reasonable upgrade later.

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  createdAt: string;
}

export async function register(data: RegisterRequest): Promise<UserResponse> {
  const response = await apiClient.post<UserResponse>('/auth/register', data);
  return response.data;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
}

export async function requestPasswordReset(email: string): Promise<void> { await apiClient.post('/auth/password-reset/request', { email }); }
export async function confirmPasswordReset(token: string, password: string): Promise<void> { await apiClient.post('/auth/password-reset/confirm', { token, password }); }
export async function confirmEmailVerification(token: string): Promise<void> { await apiClient.post('/auth/email-verification/confirm', { token }); }
export async function resendEmailVerification(email: string): Promise<void> { await apiClient.post('/auth/email-verification/resend', { email }); }
export async function exchangeOAuthCode(token: string): Promise<AuthResponse> { const response = await apiClient.post<AuthResponse>('/auth/oauth/exchange', { token }); return response.data; }

export async function getCurrentUser(): Promise<UserResponse> {
  const response = await apiClient.get<UserResponse>('/users/me');
  return response.data;
}

// True only when the server looked at the refresh token and rejected it
// (invalid, expired or revoked). Only this should end the session; any other
// failure (500, 502/503/504, timeout, network error) is transient.
export function isRefreshRejection(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 400 || status === 401 || status === 403;
}

// A sleeping backend can take over two minutes to answer, so allow for that.
const REFRESH_TIMEOUT_MS = 180_000;

// Retry only when the server answered with a 5xx: the refresh is rolled back
// then, so the token is still usable. Timeouts and network errors are not
// retried, because the server may already have rotated the token and a retry
// would present one that is no longer valid.
const RETRY_DELAYS_MS = [3_000, 8_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Called by the axios interceptor to silently swap a new access token.
// Uses a plain axios instance (not apiClient) so the interceptor can't
// accidentally intercept its own refresh call. It uses the same base URL as
// apiClient, so refresh goes to the same backend as every other request.
export async function refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await axios.post<AuthResponse>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { timeout: REFRESH_TIMEOUT_MS },
      );
      return response.data;
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      const retryable = status !== undefined && status >= 500;
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw error;
      await sleep(RETRY_DELAYS_MS[attempt] ?? 0);
    }
  }
}

export async function logout(refreshToken: string): Promise<void> {
  // Best-effort — the user is logged out client-side regardless of whether
  // this call succeeds (e.g. if the token was already revoked).
  try {
    await apiClient.post('/auth/logout', { refreshToken });
  } catch {
    // swallow; client-side logout proceeds either way
  }
}
