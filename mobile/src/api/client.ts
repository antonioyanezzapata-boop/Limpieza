/**
 * Thin fetch wrapper around the backend REST API.
 *
 * - Base URL defaults to EXPO_PUBLIC_API_URL (baked in at build time) but can
 *   be overridden at runtime — see `../config/serverUrl` — so one APK build
 *   can be pointed at whatever backend the installer actually deployed.
 * - Bearer token is injected automatically from an in-memory token holder that
 *   AuthContext keeps up to date (see `setAuthTokens` / `setUnauthorizedHandler`).
 * - On a 401 the request is retried exactly once after asking the registered
 *   handler to refresh the session; if that fails the original 401 is thrown.
 * - Network failures (no response at all: offline, DNS, timeout) are surfaced
 *   as ApiError with `status: undefined` so callers can tell them apart from
 *   business-rule errors (400/409/etc.) coming back from the server.
 */
import { getApiBaseUrl } from '../config/serverUrl';

export class ApiError extends Error {
  /** HTTP status code, or undefined when the request never reached the server. */
  status?: number;
  /** Raw parsed body, when available, for callers that need extra fields. */
  body?: unknown;
  /** True when this looks like a connectivity problem rather than a business error. */
  isNetworkError: boolean;

  constructor(message: string, opts: { status?: number; body?: unknown; isNetworkError?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.body = opts.body;
    this.isNetworkError = opts.isNetworkError ?? false;
  }
}

interface TokenHolder {
  accessToken: string | null;
  refreshToken: string | null;
}

const tokens: TokenHolder = { accessToken: null, refreshToken: null };

/** Called by AuthContext whenever tokens are loaded from storage, refreshed, or cleared. */
export function setAuthTokens(next: TokenHolder): void {
  tokens.accessToken = next.accessToken;
  tokens.refreshToken = next.refreshToken;
}

export function getAuthTokens(): TokenHolder {
  return { ...tokens };
}

type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;
/** AuthContext registers a function that performs the refresh call and returns the new access token, or null if refresh failed (session must be terminated). */
export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
/** AuthContext registers a function invoked when refresh ultimately fails, so the app can drop to the login screen. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip Bearer header injection (login/refresh don't need or have a token yet). */
  skipAuth?: boolean;
  /** Skip the automatic refresh-and-retry-on-401 behaviour. */
  skipRefreshRetry?: boolean;
}

async function rawFetch(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (!options.skipAuth && tokens.accessToken) {
    headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    // fetch throws TypeError (or similar) when there's no network / server unreachable.
    throw new ApiError(err instanceof Error ? err.message : 'Network request failed', {
      isNetworkError: true,
    });
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && m.length > 0 && typeof m[0] === 'string') return m[0];
  }
  return fallback;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await rawFetch(path, options);

  if (response.status === 401 && !options.skipAuth && !options.skipRefreshRetry && refreshHandler) {
    const newAccessToken = await refreshHandler();
    if (newAccessToken) {
      const retryResponse = await rawFetch(path, options);
      if (retryResponse.ok) {
        return (await parseBody(retryResponse)) as T;
      }
      const retryBody = await parseBody(retryResponse);
      throw new ApiError(extractMessage(retryBody, `Error ${retryResponse.status}`), {
        status: retryResponse.status,
        body: retryBody,
      });
    }
    unauthorizedHandler?.();
    const body = await parseBody(response);
    throw new ApiError(extractMessage(body, 'Sesión expirada'), { status: 401, body });
  }

  if (!response.ok) {
    const body = await parseBody(response);
    if (response.status === 401 && !options.skipAuth) {
      unauthorizedHandler?.();
    }
    throw new ApiError(extractMessage(body, `Error ${response.status}`), {
      status: response.status,
      body,
    });
  }

  return (await parseBody(response)) as T;
}
