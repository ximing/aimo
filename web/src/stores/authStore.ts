import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/api/types'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user: User, token: string) => {
        set({ user, token })
        localStorage.setItem('token', token)
      },
      clearAuth: () => {
        set({ user: null, token: null })
        localStorage.removeItem('token')
      },
      isAuthenticated: () => !!get().token
    }),
    {
      name: 'auth-storage'
    }
  )
) 