import { apiRequest, apiRequestBlob } from './client'
import type {
  AreaWithoutCleaningRow,
  ByAreaRow,
  ByEmployeeRow,
  CleaningTimesReport,
  ExportFormat,
  ReportFilters,
} from './types'

export function getCleaningTimesReport(filters: ReportFilters = {}): Promise<CleaningTimesReport> {
  return apiRequest<CleaningTimesReport>('/reports/cleaning-times', { query: { ...filters } })
}

export function getByAreaReport(filters: ReportFilters = {}): Promise<ByAreaRow[]> {
  return apiRequest<ByAreaRow[]>('/reports/by-area', { query: { ...filters } })
}

export function getByEmployeeReport(filters: ReportFilters = {}): Promise<ByEmployeeRow[]> {
  return apiRequest<ByEmployeeRow[]>('/reports/by-employee', { query: { ...filters } })
}

export function getAreasWithoutCleaning(date: string): Promise<AreaWithoutCleaningRow[]> {
  return apiRequest<AreaWithoutCleaningRow[]>('/reports/areas-without-cleaning', { query: { date } })
}

const EXPORT_EXTENSIONS: Record<ExportFormat, string> = {
  xlsx: 'xlsx',
  csv: 'csv',
  pdf: 'pdf',
}

export async function exportCleaningTimes(
  format: ExportFormat,
  filters: ReportFilters = {},
): Promise<{ blob: Blob; filename: string }> {
  const { blob, filename } = await apiRequestBlob('/reports/cleaning-times/export', {
    query: { format, ...filters },
  })
  return { blob, filename: filename ?? `tiempos-limpieza.${EXPORT_EXTENSIONS[format]}` }
}
