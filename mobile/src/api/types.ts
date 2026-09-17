/**
 * Types mirroring the backend REST API contract (NestJS, base path /api/v1).
 * Kept intentionally close to the wire shape so the rest of the app can rely
 * on them without re-deriving structure from raw JSON.
 */

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'CLEANING_STAFF';

export interface User {
  id: string;
  organizationId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export type DevicePlatform = 'android' | 'ios' | 'web';

export interface LoginRequest {
  emailOrEmployeeCode: string;
  password: string;
  deviceId: string;
  devicePlatform?: DevicePlatform;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  hasOfflinePin: boolean;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface OfflineCredentialsRequest {
  currentPassword: string;
  pin: string;
}

export interface OfflineCredentialsResponse {
  offlinePinHash: string;
  employeeCode: string;
}

export interface VerifyActiveResponse {
  active: boolean;
}

export interface Area {
  id: string;
  code: string;
  name: string;
  floor: string;
  zone?: string;
}

export interface ResolveQrRequest {
  token: string;
}

export interface ResolveQrResponse {
  qrId: string;
  area: Area;
}

export type AccessEventType = 'ENTRY' | 'EXIT';
export type SessionStatus = 'OPEN' | 'COMPLETED';

export interface AccessEventRequest {
  qrToken: string;
  eventType: AccessEventType;
  deviceId: string;
  deviceTimestamp?: string;
  observations?: string;
  /** Idempotency key. Always generated client-side, before the network call is attempted. */
  clientUuid: string;
}

export interface AccessEventRecord {
  id: string;
  eventType: AccessEventType;
  deviceTimestamp?: string;
  clientUuid?: string;
  [key: string]: unknown;
}

export interface AccessSession {
  id: string;
  status: SessionStatus;
  startedAt: string;
  finishedAt?: string | null;
  durationSeconds?: number | null;
  [key: string]: unknown;
}

export interface AccessEventResponse {
  event: AccessEventRecord;
  session: AccessSession;
}

export interface CurrentSessionItem {
  sessionId: string;
  area: {
    id: string;
    name: string;
    floor: string;
  };
  startedAt: string;
  elapsedSeconds: number;
}

export type HistoryRange = 'today' | 'yesterday' | 'week' | 'month';

export interface HistorySessionItem {
  id: string;
  area: {
    id: string;
    name: string;
  };
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  status: SessionStatus;
}

export interface HistoryResponse {
  range: HistoryRange;
  sessions: HistorySessionItem[];
  totalSeconds: number;
}

export interface SyncBatchResultItem {
  clientUuid: string;
  success: boolean;
  eventId?: string;
  error?: string;
}
