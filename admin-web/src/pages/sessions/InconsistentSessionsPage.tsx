import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as reportsApi from '../../api/reports'
import { ApiError } from '../../api/client'
import type { CleaningTimeRow, SessionStatus } from '../../api/types'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Card, CardBody } from '../../components/ui/Card'
import { Select } from '../../components/ui/Field'
import { Alert, EmptyState, PageLoading } from '../../components/ui/Feedback'
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '../../components/ui/Table'
import { formatDuration, statusLabel } from '../../lib/format'

const STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
  { value: 'OPEN', label: 'Abiertos' },
  { value: 'INCONSISTENT', label: 'Inconsistentes' },
  { value: 'CORRECTED', label: 'Corregidos' },
]

export function InconsistentSessionsPage() {
  const [statusFilter, setStatusFilter] = useState<SessionStatus>('INCONSISTENT')
  const [rows, setRows] = useState<CleaningTimeRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const report = await reportsApi.getCleaningTimesReport({ status: statusFilter })
        if (!cancelled) setRows(report.rows)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar los registros')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [statusFilter])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Registros inconsistentes</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Sesiones abiertas por demasiado tiempo, inconsistentes o corregidas que requieren revisión.
        </p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="text-sm font-medium text-[var(--color-text-muted)]">Estado</label>
          <Select
            className="sm:w-64"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SessionStatus)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        {isLoading ? (
          <PageLoading />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Fecha</Th>
                <Th>Usuario</Th>
                <Th>Área</Th>
                <Th>Entrada</Th>
                <Th>Salida</Th>
                <Th>Duración</Th>
                <Th>Estado</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.length === 0 ? (
                <TableEmptyState colSpan={8}>
                  <EmptyState
                    title="Sin registros"
                    description="No hay sesiones en este estado por el momento."
                  />
                </TableEmptyState>
              ) : (
                rows.map((row) => (
                  <Tr key={row.sessionId}>
                    <Td>{row.fecha}</Td>
                    <Td>
                      {row.nombreUsuario}
                      <div className="text-xs text-[var(--color-text-muted)]">{row.codigoUsuario}</div>
                    </Td>
                    <Td>{row.area}</Td>
                    <Td>{row.horaEntrada ?? '—'}</Td>
                    <Td>{row.horaSalida ?? 'Sin registrar'}</Td>
                    <Td>{row.duracion ?? formatDuration(row.duracionSegundos)}</Td>
                    <Td>
                      <Badge tone={statusTone(row.estado)}>{statusLabel(row.estado)}</Badge>
                    </Td>
                    <Td>
                      <Link
                        to={`/sessions/${row.sessionId}`}
                        state={{ row }}
                        className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                      >
                        Revisar / Corregir
                      </Link>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
