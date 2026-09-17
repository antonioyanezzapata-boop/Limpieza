// Shared types mirroring the backend REST API contract (base path /api/v1).

export type Role = 'ADMIN' | 'SUPERVISOR' | 'CLEANING_STAFF'

export type UserStatus = 'ACTIVE' | 'INACTIVE'

export type SessionStatus = 'OPEN' | 'COMPLETED' | 'INCONSISTENT' | 'CORRECTED'

export type Shift = 'morning' | 'afternoon' | 'night'

export type ExportFormat = 'xlsx' | 'csv' | 'pdf'

export interface AuthUser {
  id: string
  organizationId: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  role: Role
}

export interface LoginRequest {
  emailOrEmployeeCode: string
  password: string
  deviceId: string
  devicePlatform?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
  hasOfflinePin: boolean
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface UserRoleRef {
  name: Role
}

export interface AdminUser {
  id: string
  employeeCode: string
  firstName: string
  lastName: string
  identification: string
  email: string
  phone?: string | null
  status: UserStatus
  lastLoginAt?: string | null
  lastLoginDevice?: string | null
  createdAt: string
  updatedAt: string
  role: UserRoleRef
}

export interface CreateUserRequest {
  firstName: string
  lastName: string
  identification: string
  employeeCode: string
  email: string
  phone?: string
  role: Role
  password: string
}

export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
  identification?: string
  email?: string
  phone?: string
  role?: Role
}

export interface QrCode {
  id: string
  areaId: string
  token: string
  status: 'ACTIVE' | 'REVOKED'
  createdAt: string
  revokedAt?: string | null
  content: string
}

export interface Area {
  id: string
  code: string
  name: string
  floor?: string | null
  zone?: string | null
  description?: string | null
  status: UserStatus
  createdAt: string
  updatedAt: string
  qrCodes: QrCode[]
}

export interface CreateAreaRequest {
  code: string
  name: string
  floor?: string
  zone?: string
  description?: string
  siteId?: string
}

export interface UpdateAreaRequest {
  code?: string
  name?: string
  floor?: string
  zone?: string
  description?: string
  siteId?: string
}

export interface CorrectSessionRequest {
  entryTimestamp?: string
  exitTimestamp?: string
  areaId?: string
  observations?: string
  reason: string
}

export interface CleaningTimeRow {
  fecha: string
  codigoUsuario: string
  nombreUsuario: string
  area: string
  piso?: string | null
  zona?: string | null
  horaEntrada?: string | null
  horaSalida?: string | null
  duracion?: string | null
  duracionSegundos?: number | null
  estado: SessionStatus
  observacion?: string | null
  sessionId: string
}

export interface CleaningTimesSummary {
  totalRegistros: number
  totalHorasSegundos: number
  areasAtendidas: number
  usuariosParticipantes: number
  registrosAbiertos: number
  registrosInconsistentes: number
}

export interface CleaningTimesReport {
  rows: CleaningTimeRow[]
  summary: CleaningTimesSummary
}

export interface ByAreaRow {
  area: string
  count: number
  totalSeconds: number
  averageSeconds: number
  lastCleaning?: string | null
}

export interface ByEmployeeRow {
  employee: string
  areasAttended: number
  totalSeconds: number
  averageSeconds: number
  incompleteRecords: number
}

export interface AreaWithoutCleaningRow {
  areaId: string
  code: string
  name: string
  attended: boolean
}

export interface ReportFilters {
  dateFrom?: string
  dateTo?: string
  userId?: string
  areaId?: string
  floor?: string
  zone?: string
  status?: SessionStatus
  shift?: Shift
}

export interface DashboardKpis {
  activeStaffToday: number
  areasAttendedToday: number
  cleaningsCompletedToday: number
  openRecords: number
  incompleteRecords: number
  averageSecondsPerArea: number
  totalSecondsToday: number
}

export interface ChartPoint {
  label: string
  value: number
}

export interface IncompleteSession {
  id: string
  area: string
  user: string
  startedAt: string
}

export interface DashboardSummary {
  kpis: DashboardKpis
  charts: {
    cleaningsByArea: ChartPoint[]
    timeByArea: ChartPoint[]
    cleaningsByDay: ChartPoint[]
    timeByUser: ChartPoint[]
  }
  incompleteSessions: IncompleteSession[]
}

export interface AuditActor {
  firstName: string
  lastName: string
  employeeCode: string
}

export interface AuditLogEntry {
  id: string
  action: string
  entity: string
  entityId: string
  previousValue?: unknown
  newValue?: unknown
  reason?: string | null
  ipAddress?: string | null
  device?: string | null
  createdAt: string
  actor: AuditActor
}

export interface AuditLogFilters {
  entity?: string
  entityId?: string
  actorUserId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface AuditLogResponse {
  items: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}

export interface ApiErrorBody {
  message?: string | string[]
  error?: string
  statusCode?: number
}
