import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

// Utility to check if JWT token is expired
const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= exp;
  } catch {
    return true;
  }
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingEmail: string | null; // For email verification flow

  // Actions
  setUser: (user: User, token: string) => void;
  setPendingEmail: (email: string) => void;
  clearPendingEmail: () => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  checkTokenExpiration: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      pendingEmail: null,

      setUser: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        // Immediately sync token to localStorage for API interceptor
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
      },

      setPendingEmail: (email) => {
        set({ pendingEmail: email });
      },

      clearPendingEmail: () => {
        set({ pendingEmail: null });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          pendingEmail: null,
        });
        // Clear localStorage items not managed by persist
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          // Also clear onboarding and branch storage to prevent data leaking between users
          localStorage.removeItem('onboarding-storage');
          localStorage.removeItem('branch-storage');
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      checkTokenExpiration: () => {
        const state = useAuthStore.getState();
        if (!state.token) return false; // No token means not logged in, not necessarily expired
        
        const expired = isTokenExpired(state.token);
        if (expired) {
          // Token expired, logout user
          state.logout();
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('sessionExpired', 'true');
          }
          return true;
        }
        return false;
      },
    }),
    {
      name: 'auth-storage',
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        pendingEmail: state.pendingEmail,
      }),
      onRehydrateStorage: () => (state) => {
        // Set loading to false after rehydration
        if (state) {
          state.setLoading(false);
          // Check token expiration on rehydration
          if (state.token) {
            const expired = isTokenExpired(state.token);
            if (expired) {
              state.logout();
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('sessionExpired', 'true');
              }
            } else if (typeof window !== 'undefined') {
              // Sync valid token to localStorage for API interceptor
              localStorage.setItem('token', state.token);
            }
          }
        }
      },
    }
  )
);

export default useAuthStore;
