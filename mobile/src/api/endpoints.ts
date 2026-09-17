import { apiRequest } from './client';
import type {
  AccessEventRequest,
  AccessEventResponse,
  CurrentSessionItem,
  HistoryRange,
  HistoryResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  OfflineCredentialsRequest,
  OfflineCredentialsResponse,
  RefreshRequest,
  RefreshResponse,
  ResolveQrRequest,
  ResolveQrResponse,
  SyncBatchResultItem,
  User,
  VerifyActiveResponse,
} from './types';

export function login(body: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body, skipAuth: true });
}

export function refresh(body: RefreshRequest): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body,
    skipAuth: true,
    skipRefreshRetry: true,
  });
}

export function logout(body: LogoutRequest): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST', body });
}

export function me(): Promise<User> {
  return apiRequest<User>('/auth/me', { method: 'GET' });
}

export function setOfflineCredentials(
  body: OfflineCredentialsRequest,
): Promise<OfflineCredentialsResponse> {
  return apiRequest<OfflineCredentialsResponse>('/auth/offline-credentials', {
    method: 'POST',
    body,
  });
}

export function verifyActive(): Promise<VerifyActiveResponse> {
  return apiRequest<VerifyActiveResponse>('/auth/verify-active', { method: 'GET' });
}

export function resolveQr(body: ResolveQrRequest): Promise<ResolveQrResponse> {
  return apiRequest<ResolveQrResponse>('/qr-codes/resolve', { method: 'POST', body });
}

export function createAccessEvent(body: AccessEventRequest): Promise<AccessEventResponse> {
  return apiRequest<AccessEventResponse>('/access-events', { method: 'POST', body });
}

export function getCurrentSessions(): Promise<CurrentSessionItem[]> {
  return apiRequest<CurrentSessionItem[]>('/access-events/current', { method: 'GET' });
}

export function getHistory(range: HistoryRange): Promise<HistoryResponse> {
  return apiRequest<HistoryResponse>(`/access-events/history?range=${range}`, { method: 'GET' });
}

export function syncBatch(events: AccessEventRequest[]): Promise<SyncBatchResultItem[]> {
  return apiRequest<SyncBatchResultItem[]>('/sync/batch', { method: 'POST', body: { events } });
}
