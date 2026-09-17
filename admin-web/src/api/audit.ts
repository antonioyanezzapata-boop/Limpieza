import { apiRequest } from './client'
import type { AuditLogFilters, AuditLogResponse } from './types'

export function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
  return apiRequest<AuditLogResponse>('/audit-logs', { query: { ...filters } })
}
