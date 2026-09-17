import { apiRequest } from './client'
import type { AuthUser, LoginRequest, LoginResponse, RefreshResponse } from './types'

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload, skipAuth: true })
}

export function refresh(refreshToken: string): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
    skipAuth: true,
  })
}

export function logout(refreshToken: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/auth/logout', {
    method: 'POST',
    body: { refreshToken },
    skipRefresh: true,
  })
}

export function me(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me')
}

/** Generates a stable-ish per-browser device id for web admin sessions. */
export function getWebDeviceId(): string {
  const key = 'admin-web.deviceId'
  try {
    let id = localStorage.getItem(key)
    if (!id) {
      id = `admin-web-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return 'admin-web-session'
  }
}
