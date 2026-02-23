import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

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
    }),
    {
      name: 'auth-storage',
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
          // Sync token to localStorage for API interceptor
          if (state.token && typeof window !== 'undefined') {
            localStorage.setItem('token', state.token);
          }
        }
      },
    }
  )
);

export default useAuthStore;
