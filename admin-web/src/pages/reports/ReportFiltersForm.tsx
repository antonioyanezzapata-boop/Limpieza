import type { FormEvent, ReactNode } from 'react'
import type { AdminUser, Area, ReportFilters, SessionStatus, Shift } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'

interface ReportFiltersFormProps {
  filters: ReportFilters
  onChange: (filters: ReportFilters) => void
  onSubmit: () => void
  areas: Area[]
  users: AdminUser[]
  includeStatus?: boolean
  includeShift?: boolean
  extraActions?: ReactNode
}

export function ReportFiltersForm({
  filters,
  onChange,
  onSubmit,
  areas,
  users,
  includeStatus = true,
  includeShift = true,
  extraActions,
}: ReportFiltersFormProps) {
  function set<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    onChange({ ...filters, [key]: value || undefined })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Desde</label>
        <Input type="date" value={filters.dateFrom ?? ''} onChange={(e) => set('dateFrom', e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Hasta</label>
        <Input type="date" value={filters.dateTo ?? ''} onChange={(e) => set('dateTo', e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Área</label>
        <Select value={filters.areaId ?? ''} onChange={(e) => set('areaId', e.target.value)}>
          <option value="">Todas</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.code} — {area.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Usuario</label>
        <Select value={filters.userId ?? ''} onChange={(e) => set('userId', e.target.value)}>
          <option value="">Todos</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Piso</label>
        <Input value={filters.floor ?? ''} onChange={(e) => set('floor', e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Zona</label>
        <Input value={filters.zone ?? ''} onChange={(e) => set('zone', e.target.value)} />
      </div>
      {includeStatus && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Estado</label>
          <Select
            value={filters.status ?? ''}
            onChange={(e) => set('status', e.target.value as SessionStatus)}
          >
            <option value="">Todos</option>
            <option value="OPEN">Abierto</option>
            <option value="COMPLETED">Completado</option>
            <option value="INCONSISTENT">Inconsistente</option>
            <option value="CORRECTED">Corregido</option>
          </Select>
        </div>
      )}
      {includeShift && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Turno</label>
          <Select value={filters.shift ?? ''} onChange={(e) => set('shift', e.target.value as Shift)}>
            <option value="">Todos</option>
            <option value="morning">Mañana</option>
            <option value="afternoon">Tarde</option>
            <option value="night">Noche</option>
          </Select>
        </div>
      )}
      <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-2">
        <Button type="submit" variant="secondary">
          Aplicar filtros
        </Button>
        {extraActions}
      </div>
    </form>
  )
}
