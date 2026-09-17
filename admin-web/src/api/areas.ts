import { apiRequest, apiRequestBlob } from './client'
import type { Area, CreateAreaRequest, QrCode, UpdateAreaRequest, UserStatus } from './types'

export interface AreaListFilters {
  search?: string
  status?: UserStatus
  floor?: string
  zone?: string
}

export function listAreas(filters: AreaListFilters = {}): Promise<Area[]> {
  return apiRequest<Area[]>('/areas', { query: { ...filters } })
}

export function getArea(id: string): Promise<Area> {
  return apiRequest<Area>(`/areas/${id}`)
}

export function createArea(payload: CreateAreaRequest): Promise<Area> {
  return apiRequest<Area>('/areas', { method: 'POST', body: payload })
}

export function updateArea(id: string, payload: UpdateAreaRequest): Promise<Area> {
  return apiRequest<Area>(`/areas/${id}`, { method: 'PATCH', body: payload })
}

export function deactivateArea(id: string): Promise<Area> {
  return apiRequest<Area>(`/areas/${id}/deactivate`, { method: 'POST' })
}

export function activateArea(id: string): Promise<Area> {
  return apiRequest<Area>(`/areas/${id}/activate`, { method: 'POST' })
}

export function generateQrCode(areaId: string): Promise<QrCode> {
  return apiRequest<QrCode>(`/areas/${areaId}/qr-codes`, { method: 'POST' })
}

export function listQrCodes(areaId: string): Promise<QrCode[]> {
  return apiRequest<QrCode[]>(`/areas/${areaId}/qr-codes`)
}

export async function fetchQrPng(qrId: string): Promise<{ blob: Blob; filename?: string }> {
  return apiRequestBlob(`/qr-codes/${qrId}/png`)
}
