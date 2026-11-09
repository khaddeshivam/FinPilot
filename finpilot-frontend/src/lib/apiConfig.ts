// Base URL for every API call. Lives in its own file so apiClient.ts and
// authApi.ts can share it (including the token refresh call) without importing
// each other just for a constant.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';