import { apiRequest } from './client'
import type { AdminUser, CreateUserRequest, Role, UpdateUserRequest, UserStatus } from './types'

export interface UserListFilters {
  search?: string
  status?: UserStatus
  role?: Role
}

export function listUsers(filters: UserListFilters = {}): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>('/users', { query: { ...filters } })
}

export function getUser(id: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}`)
}

export function createUser(payload: CreateUserRequest): Promise<AdminUser> {
  return apiRequest<AdminUser>('/users', { method: 'POST', body: payload })
}

export function updateUser(id: string, payload: UpdateUserRequest): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}`, { method: 'PATCH', body: payload })
}

export function deactivateUser(id: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}/deactivate`, { method: 'POST' })
}

export function activateUser(id: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}/activate`, { method: 'POST' })
}

export function resetPassword(id: string, newPassword: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/users/${id}/reset-password`, {
    method: 'POST',
    body: { newPassword },
  })
}
