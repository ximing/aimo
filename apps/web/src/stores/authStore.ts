import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserResponse } from '@/api/types';

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  setAuth: (token: string, user: UserResponse) => void;
  updateUser: (user: Partial<UserResponse>) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
      clearAuth: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage',
    }
  )
);
