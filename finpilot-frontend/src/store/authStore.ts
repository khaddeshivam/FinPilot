import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

// Deliberately in-memory (no persist middleware / localStorage). A JWT sitting
// in localStorage is readable by any script that gets injected via XSS -
// keeping it in memory means a page refresh logs the user out, which is a
// real UX tradeoff, but it's the safer default until httpOnly cookies or a
// more deliberate storage strategy gets designed.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  setTokens: (accessToken, refreshToken) =>
    set({ accessToken, refreshToken, isAuthenticated: true }),
  logout: () =>
    set({ accessToken: null, refreshToken: null, isAuthenticated: false }),
}));
