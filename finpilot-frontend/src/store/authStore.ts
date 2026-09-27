import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

// sessionStorage keeps the session alive across same-tab page refreshes but
// clears it when the tab is closed - a better tradeoff than in-memory (which
// logs the user out on every F5) while still being safer than localStorage
// (which persists indefinitely and is readable by any script in the origin).
// httpOnly cookies would be the ideal end state; this is the right step now.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'finpilot-auth',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist the tokens - UI state stays ephemeral.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
