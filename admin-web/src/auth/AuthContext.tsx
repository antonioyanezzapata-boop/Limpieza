import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as authApi from '../api/auth'
import { AUTH_LOGOUT_EVENT } from '../api/client'
import { tokenStorage } from '../api/tokenStorage'
import type { AuthUser } from '../api/types'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  isInitializing: boolean
  login: (emailOrEmployeeCode: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => tokenStorage.getUser())
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      const token = tokenStorage.getAccessToken()
      if (!token) {
        setIsInitializing(false)
        return
      }
      try {
        const freshUser = await authApi.me()
        if (!cancelled) setUser(freshUser)
      } catch {
        // apiRequest already clears storage + fires AUTH_LOGOUT_EVENT on 401
      } finally {
        if (!cancelled) setIsInitializing(false)
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleLogout() {
      setUser(null)
    }
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout)
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout)
  }, [])

  const login = useCallback(async (emailOrEmployeeCode: string, password: string) => {
    const response = await authApi.login({
      emailOrEmployeeCode,
      password,
      deviceId: authApi.getWebDeviceId(),
      devicePlatform: 'web',
    })
    tokenStorage.setSession(response.accessToken, response.refreshToken, response.user)
    setUser(response.user)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    tokenStorage.clear()
    setUser(null)
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        // best-effort server-side revoke; local session is already cleared
      }
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      isInitializing,
      login,
      logout,
    }),
    [user, isInitializing, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
