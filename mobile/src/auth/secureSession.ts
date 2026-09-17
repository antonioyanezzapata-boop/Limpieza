import * as SecureStore from 'expo-secure-store';
import type { User } from '../api/types';

/**
 * Persists the current session (tokens + user profile) in SecureStore so the
 * app can restore it on relaunch, and so it's available for offline use
 * (the cached user profile is what an offline session runs against).
 */

const ACCESS_TOKEN_KEY = 'session.accessToken';
const REFRESH_TOKEN_KEY = 'session.refreshToken';
const USER_KEY = 'session.user';
const HAS_OFFLINE_PIN_KEY = 'session.hasOfflinePin';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: User;
  hasOfflinePin: boolean;
}

export async function saveSession(session: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user)),
    SecureStore.setItemAsync(HAS_OFFLINE_PIN_KEY, session.hasOfflinePin ? '1' : '0'),
  ]);
}

export async function updateStoredTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function updateStoredHasOfflinePin(hasOfflinePin: boolean): Promise<void> {
  await SecureStore.setItemAsync(HAS_OFFLINE_PIN_KEY, hasOfflinePin ? '1' : '0');
}

export async function updateStoredUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken, userRaw, hasOfflinePinRaw] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY),
    SecureStore.getItemAsync(HAS_OFFLINE_PIN_KEY),
  ]);
  if (!accessToken || !refreshToken || !userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as User;
    return { accessToken, refreshToken, user, hasOfflinePin: hasOfflinePinRaw === '1' };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(HAS_OFFLINE_PIN_KEY),
  ]);
}
