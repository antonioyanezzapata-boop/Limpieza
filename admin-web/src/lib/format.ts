export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('es', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function formatTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

/** Formats a total number of seconds as `Hh Mm` / `Mm Ss`. */
export function formatDuration(totalSeconds?: number | null): string {
  if (totalSeconds === undefined || totalSeconds === null || Number.isNaN(totalSeconds)) {
    return '—'
  }
  const seconds = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** Converts a `Date` to a `YYYY-MM-DD` string in local time (for date inputs / API filters). */
export function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Converts a `<input type="datetime-local">` value to an ISO string, or undefined if empty. */
export function localDateTimeToIso(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

/** Converts an ISO timestamp to a value usable by `<input type="datetime-local">`. */
export function isoToLocalDateTimeInput(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${hh}:${mm}`
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'Abierto'
    case 'COMPLETED':
      return 'Completado'
    case 'INCONSISTENT':
      return 'Inconsistente'
    case 'CORRECTED':
      return 'Corregido'
    case 'ACTIVE':
      return 'Activo'
    case 'INACTIVE':
      return 'Inactivo'
    case 'REVOKED':
      return 'Revocado'
    default:
      return status
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador'
    case 'SUPERVISOR':
      return 'Supervisor'
    case 'CLEANING_STAFF':
      return 'Personal de limpieza'
    default:
      return role
  }
}

export function shiftLabel(shift: string): string {
  switch (shift) {
    case 'morning':
      return 'Mañana'
    case 'afternoon':
      return 'Tarde'
    case 'night':
      return 'Noche'
    default:
      return shift
  }
}
