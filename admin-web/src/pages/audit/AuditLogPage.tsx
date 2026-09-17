import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import * as auditApi from '../../api/audit'
import { ApiError } from '../../api/client'
import type { AuditLogEntry, AuditLogFilters } from '../../api/types'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Alert, EmptyState, PageLoading } from '../../components/ui/Feedback'
import { Pagination } from '../../components/ui/Pagination'
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '../../components/ui/Table'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 20

function valuePreview(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function AuditLogPage() {
  const [filters, setFilters] = useState<Omit<AuditLogFilters, 'page' | 'pageSize'>>({})
  const [appliedFilters, setAppliedFilters] = useState<Omit<AuditLogFilters, 'page' | 'pageSize'>>({})
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await auditApi.listAuditLogs({ ...appliedFilters, page, pageSize: PAGE_SIZE })
        if (!cancelled) {
          setItems(data.items)
          setTotal(data.total)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar la auditoría')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [appliedFilters, page])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setAppliedFilters(filters)
  }

  function update<K extends keyof typeof filters>(key: K, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Auditoría</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Historial de acciones administrativas y correcciones realizadas en el sistema.
        </p>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <Input placeholder="Entidad (ej. Session, User)" value={filters.entity ?? ''} onChange={(e) => update('entity', e.target.value)} />
            <Input placeholder="ID de entidad" value={filters.entityId ?? ''} onChange={(e) => update('entityId', e.target.value)} />
            <Input placeholder="ID de usuario responsable" value={filters.actorUserId ?? ''} onChange={(e) => update('actorUserId', e.target.value)} />
            <Input type="date" value={filters.dateFrom ?? ''} onChange={(e) => update('dateFrom', e.target.value)} />
            <Input type="date" value={filters.dateTo ?? ''} onChange={(e) => update('dateTo', e.target.value)} />
            <div className="sm:col-span-5">
              <Button type="submit" variant="secondary">
                Filtrar
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        {isLoading ? (
          <PageLoading />
        ) : (
          <>
            <Table>
              <Thead>
                <Tr>
                  <Th>Fecha</Th>
                  <Th>Actor</Th>
                  <Th>Acción</Th>
                  <Th>Entidad</Th>
                  <Th>Valor anterior</Th>
                  <Th>Valor nuevo</Th>
                  <Th>Motivo</Th>
                  <Th>Origen</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.length === 0 ? (
                  <TableEmptyState colSpan={8}>
                    <EmptyState title="Sin resultados" description="Ajuste los filtros de búsqueda." />
                  </TableEmptyState>
                ) : (
                  items.map((entry) => (
                    <Tr key={entry.id}>
                      <Td className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</Td>
                      <Td>
                        {entry.actor.firstName} {entry.actor.lastName}
                        <div className="text-xs text-[var(--color-text-muted)]">{entry.actor.employeeCode}</div>
                      </Td>
                      <Td className="whitespace-nowrap font-medium">{entry.action}</Td>
                      <Td>
                        {entry.entity}
                        <div className="text-xs text-[var(--color-text-muted)]">{entry.entityId}</div>
                      </Td>
                      <Td className="max-w-[200px] truncate text-xs text-[var(--color-text-muted)]" title={valuePreview(entry.previousValue)}>
                        {valuePreview(entry.previousValue)}
                      </Td>
                      <Td className="max-w-[200px] truncate text-xs" title={valuePreview(entry.newValue)}>
                        {valuePreview(entry.newValue)}
                      </Td>
                      <Td className="max-w-[180px] truncate" title={entry.reason ?? undefined}>
                        {entry.reason ?? '—'}
                      </Td>
                      <Td className="text-xs text-[var(--color-text-muted)]">
                        {entry.ipAddress ?? '—'}
                        {entry.device ? ` · ${entry.device}` : ''}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  )
}
