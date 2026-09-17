import { tokenStorage } from './tokenStorage'
import type { ApiErrorBody, RefreshResponse } from './types'

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) ||
  'http://localhost:3000/api/v1'

export class ApiError extends Error {
  status: number
  body: ApiErrorBody | undefined

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** Fired when the session can no longer be refreshed; AuthContext listens for this. */
export const AUTH_LOGOUT_EVENT = 'admin-web:auth-logout'

function notifySessionExpired(): void {
  tokenStorage.clear()
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT))
}

let refreshPromise: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefreshToken()
    if (!refreshToken) return false
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return false
      const data = (await res.json()) as RefreshResponse
      tokenStorage.setSession(data.accessToken, data.refreshToken, data.user)
      return true
    } catch {
      return false
    }
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function parseErrorBody(res: Response): Promise<ApiErrorBody | undefined> {
  try {
    return (await res.clone().json()) as ApiErrorBody
  } catch {
    return undefined
  }
}

function errorMessageFrom(body: ApiErrorBody | undefined, fallback: string): string {
  if (!body?.message) return fallback
  return Array.isArray(body.message) ? body.message.join(', ') : body.message
}

export interface RequestOptions {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  /** Skip the Authorization header (used for login/refresh). */
  skipAuth?: boolean
  /** Skip the automatic 401 refresh-and-retry (used internally to avoid loops). */
  skipRefresh?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
  )
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, query, skipAuth } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (!skipAuth) {
    const token = tokenStorage.getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/** JSON request with automatic Bearer injection and 401 refresh-and-retry. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawRequest(path, options)

  if (res.status === 401 && !options.skipAuth && !options.skipRefresh) {
    const refreshed = await refreshSession()
    if (refreshed) {
      res = await rawRequest(path, options)
    } else {
      notifySessionExpired()
      const body = await parseErrorBody(res)
      throw new ApiError(401, errorMessageFrom(body, 'Sesión expirada'), body)
    }
  }

  if (res.status === 401 && !options.skipAuth) {
    notifySessionExpired()
  }

  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new ApiError(res.status, errorMessageFrom(body, `Error ${res.status}`), body)
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

/** Fetch a binary resource (PNG, export files) with auth header + refresh retry, returns a Blob. */
export async function apiRequestBlob(
  path: string,
  options: RequestOptions = {},
): Promise<{ blob: Blob; filename?: string }> {
  let res = await rawRequest(path, options)

  if (res.status === 401 && !options.skipAuth && !options.skipRefresh) {
    const refreshed = await refreshSession()
    if (refreshed) {
      res = await rawRequest(path, options)
    } else {
      notifySessionExpired()
      throw new ApiError(401, 'Sesión expirada')
    }
  }

  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new ApiError(res.status, errorMessageFrom(body, `Error ${res.status}`), body)
  }

  const disposition = res.headers.get('Content-Disposition') || ''
  const match = /filename="?([^"]+)"?/i.exec(disposition)
  const blob = await res.blob()
  return { blob, filename: match?.[1] }
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
