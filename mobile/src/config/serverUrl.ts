import * as SecureStore from 'expo-secure-store';

/**
 * Lets a distributed APK (built once, without rebuilding) point at whatever
 * backend the person running it actually has deployed. `EXPO_PUBLIC_API_URL`
 * is still the default baked in at build time, but it can be overridden at
 * runtime from the "Servidor" screen (reachable from Login and Perfil) and
 * the override is persisted on-device.
 */
const STORAGE_KEY = 'server_api_base_url';

const BUILT_IN_DEFAULT =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1';

let currentBaseUrl = BUILT_IN_DEFAULT;
let loaded = false;

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

export function getDefaultApiBaseUrl(): string {
  return BUILT_IN_DEFAULT;
}

/** Call once on app launch, before any network request, to restore a saved override. */
export async function loadApiBaseUrl(): Promise<string> {
  if (loaded) return currentBaseUrl;
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (stored) currentBaseUrl = normalize(stored);
  } catch {
    // SecureStore unavailable - keep the built-in default.
  } finally {
    loaded = true;
  }
  return currentBaseUrl;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  const normalized = normalize(url) || BUILT_IN_DEFAULT;
  currentBaseUrl = normalized;
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, normalized);
  } catch {
    // ignore - falls back to in-memory only for this session
  }
}

export async function resetApiBaseUrl(): Promise<void> {
  currentBaseUrl = BUILT_IN_DEFAULT;
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // ignore
  }
}
