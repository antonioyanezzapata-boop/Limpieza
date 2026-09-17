import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, getAuthTokens, setAuthTokens, setRefreshHandler, setUnauthorizedHandler } from '../api/client';
import * as endpoints from '../api/endpoints';
import type { User } from '../api/types';
import { loadApiBaseUrl } from '../config/serverUrl';
import { useNetwork } from '../network/NetworkContext';
import { getDeviceId, getDevicePlatform } from '../utils/device';
import { hasOfflinePinStored, storeOfflinePin, verifyOfflinePin } from './offlineAuth';
import {
  clearSession,
  loadSession,
  saveSession,
  updateStoredHasOfflinePin,
  updateStoredTokens,
  updateStoredUser,
} from './secureSession';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface LoginOnlineResult {
  needsOfflinePinSetup: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** True when the current session was established purely on-device (PIN check), without contacting the backend. */
  isOfflineSession: boolean;
  hasOfflinePin: boolean;
  /** True once reconciliation confirms the account is inactive server-side; blocks further offline registrations. */
  accountBlocked: boolean;
  loginOnline: (emailOrEmployeeCode: string, password: string) => Promise<LoginOnlineResult>;
  loginOffline: (employeeCode: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  setOfflinePin: (currentPassword: string, pin: string) => Promise<void>;
  hasLocalOfflinePin: (employeeCode: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isConnected, isKnown } = useNetwork();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [isOfflineSession, setIsOfflineSession] = useState(false);
  const [hasOfflinePin, setHasOfflinePin] = useState(false);
  const [accountBlocked, setAccountBlocked] = useState(false);

  // Registered once; always reads the *current* refresh token from the api client module
  // so it stays correct without needing to be re-registered on every token change.
  const performRefresh = useCallback(async (): Promise<string | null> => {
    const { refreshToken } = getAuthTokens();
    if (!refreshToken) return null;
    try {
      const res = await endpoints.refresh({ refreshToken });
      setAuthTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      await updateStoredTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      return res.accessToken;
    } catch {
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setAuthTokens({ accessToken: null, refreshToken: null });
    setUser(null);
    setIsOfflineSession(false);
    setAccountBlocked(false);
    setHasOfflinePin(false);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    setRefreshHandler(performRefresh);
    setUnauthorizedHandler(() => {
      // Only fires for a genuine 401 the server sent us (i.e. we were online); never on
      // a plain network failure, so it never forces a logout while merely offline.
      signOut();
    });
    return () => {
      setRefreshHandler(null);
      setUnauthorizedHandler(null);
    };
  }, [performRefresh, signOut]);

  // Bootstrap from SecureStore on launch.
  useEffect(() => {
    (async () => {
      await loadApiBaseUrl();
      const stored = await loadSession();
      if (stored) {
        setAuthTokens({ accessToken: stored.accessToken, refreshToken: stored.refreshToken });
        setUser(stored.user);
        setHasOfflinePin(stored.hasOfflinePin);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    })();
  }, []);

  const loginOnline = useCallback(
    async (emailOrEmployeeCode: string, password: string): Promise<LoginOnlineResult> => {
      const deviceId = await getDeviceId();
      const res = await endpoints.login({
        emailOrEmployeeCode,
        password,
        deviceId,
        devicePlatform: getDevicePlatform(),
      });
      setAuthTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      await saveSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
        hasOfflinePin: res.hasOfflinePin,
      });
      setUser(res.user);
      setHasOfflinePin(res.hasOfflinePin);
      setIsOfflineSession(false);
      setAccountBlocked(false);
      setStatus('signedIn');
      return { needsOfflinePinSetup: !res.hasOfflinePin };
    },
    [],
  );

  const loginOffline = useCallback(async (employeeCode: string, pin: string): Promise<void> => {
    const valid = await verifyOfflinePin(employeeCode, pin);
    if (!valid) {
      throw new Error('Código de empleado o PIN incorrectos.');
    }
    const stored = await loadSession();
    if (!stored || stored.user.employeeCode !== employeeCode) {
      throw new Error(
        'No hay una sesión guardada en este dispositivo para ese código de empleado. Conéctate a internet para iniciar sesión al menos una vez.',
      );
    }
    setAuthTokens({ accessToken: stored.accessToken, refreshToken: stored.refreshToken });
    setUser(stored.user);
    setHasOfflinePin(true);
    setIsOfflineSession(true);
    setAccountBlocked(false);
    setStatus('signedIn');
  }, []);

  const logout = useCallback(async () => {
    const { refreshToken } = getAuthTokens();
    if (!isOfflineSession && refreshToken) {
      try {
        await endpoints.logout({ refreshToken });
      } catch {
        // Best-effort: still clear local state even if the network call fails.
      }
    }
    await signOut();
  }, [isOfflineSession, signOut]);

  const setOfflinePin = useCallback(
    async (currentPassword: string, pin: string): Promise<void> => {
      if (isOfflineSession) {
        throw new Error('Necesitas conexión a internet para configurar el PIN offline.');
      }
      if (!user) {
        throw new Error('No hay una sesión activa.');
      }
      await endpoints.setOfflineCredentials({ currentPassword, pin });
      await storeOfflinePin(user.employeeCode, pin);
      await updateStoredHasOfflinePin(true);
      setHasOfflinePin(true);
    },
    [isOfflineSession, user],
  );

  const hasLocalOfflinePin = useCallback((employeeCode: string) => hasOfflinePinStored(employeeCode), []);

  // Reconciliation: once connectivity returns while running an offline session, silently
  // confirm the account is still active and, if so, promote the session back to "online".
  const reconciling = useRef(false);
  useEffect(() => {
    if (!isKnown || !isConnected || !isOfflineSession || reconciling.current) return;
    reconciling.current = true;
    (async () => {
      try {
        const result = await endpoints.verifyActive();
        if (result.active) {
          setAccountBlocked(false);
          setIsOfflineSession(false);
          try {
            const freshUser = await endpoints.me();
            setUser(freshUser);
            await updateStoredUser(freshUser);
          } catch {
            // Non-fatal: keep the cached profile.
          }
        } else {
          setAccountBlocked(true);
        }
      } catch (err) {
        // Refresh/verify failed (still effectively offline, or token genuinely invalid).
        // ApiError with isNetworkError just means "try again next time we reconnect".
        if (err instanceof ApiError && !err.isNetworkError && err.status === 401) {
          // performRefresh already tried and failed inside apiRequest; unauthorizedHandler
          // will have signed the user out.
        }
      } finally {
        reconciling.current = false;
      }
    })();
  }, [isConnected, isKnown, isOfflineSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isOfflineSession,
      hasOfflinePin,
      accountBlocked,
      loginOnline,
      loginOffline,
      logout,
      setOfflinePin,
      hasLocalOfflinePin,
    }),
    [status, user, isOfflineSession, hasOfflinePin, accountBlocked, loginOnline, loginOffline, logout, setOfflinePin, hasLocalOfflinePin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
