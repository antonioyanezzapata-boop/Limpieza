import { useEffect, useState } from 'react'
import * as reportsApi from '../../api/reports'
import { ApiError } from '../../api/client'
import type { AreaWithoutCleaningRow } from '../../api/types'
import { Card, CardBody } from '../../components/ui/Card'
import { Input } from '../../components/ui/Field'
import { Alert, EmptyState, PageLoading } from '../../components/ui/Feedback'
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '../../components/ui/Table'
import { toDateInputValue } from '../../lib/format'

export function AreasWithoutCleaningTab() {
  const [date, setDate] = useState(() => toDateInputValue(new Date()))
  const [rows, setRows] = useState<AreaWithoutCleaningRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await reportsApi.getAreasWithoutCleaning(date)
        if (!cancelled) setRows(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el reporte')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [date])

  const pendingCount = rows.filter((r) => !r.attended).length

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-muted)]">Fecha</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {!isLoading && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {pendingCount === 0
                ? 'Todas las áreas fueron atendidas.'
                : `${pendingCount} área(s) sin atender de ${rows.length}.`}
            </p>
          )}
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
                <Th>Código</Th>
                <Th>Área</Th>
                <Th>Atendida</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.length === 0 ? (
                <TableEmptyState colSpan={3}>
                  <EmptyState title="Sin datos" description="No hay áreas registradas." />
                </TableEmptyState>
              ) : (
                rows.map((row) => (
                  <Tr key={row.areaId}>
                    <Td className="font-medium">{row.code}</Td>
                    <Td>{row.name}</Td>
                    <Td>
                      {row.attended ? (
                        <span className="inline-flex items-center gap-1.5 text-[var(--color-success)]">
                          <span aria-hidden="true">✓</span> Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[var(--color-danger)]">
                          <span aria-hidden="true">✕</span> No
                        </span>
                      )}
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
