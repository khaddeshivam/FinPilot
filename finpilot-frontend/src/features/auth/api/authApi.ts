import { apiClient } from '../../../lib/apiClient';

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

export async function getCurrentUser(): Promise<UserResponse> {
  const response = await apiClient.get<UserResponse>('/users/me');
  return response.data;
}
