import { useEffect, useState } from 'react'
import * as reportsApi from '../../api/reports'
import { ApiError } from '../../api/client'
import type { AdminUser, Area, ByAreaRow, ReportFilters } from '../../api/types'
import { Card, CardBody } from '../../components/ui/Card'
import { Alert, EmptyState, PageLoading } from '../../components/ui/Feedback'
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '../../components/ui/Table'
import { formatDateTime, formatDuration } from '../../lib/format'
import { ReportFiltersForm } from './ReportFiltersForm'

export function ByAreaTab({ areas, users }: { areas: Area[]; users: AdminUser[] }) {
  const [filters, setFilters] = useState<ReportFilters>({})
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({})
  const [rows, setRows] = useState<ByAreaRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await reportsApi.getByAreaReport(appliedFilters)
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
  }, [appliedFilters])

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <ReportFiltersForm
            filters={filters}
            onChange={setFilters}
            onSubmit={() => setAppliedFilters(filters)}
            areas={areas}
            users={users}
            includeStatus={false}
          />
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
                <Th>Área</Th>
                <Th>Limpiezas</Th>
                <Th>Tiempo total</Th>
                <Th>Tiempo promedio</Th>
                <Th>Última limpieza</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.length === 0 ? (
                <TableEmptyState colSpan={5}>
                  <EmptyState title="Sin datos" description="No hay información para los filtros seleccionados." />
                </TableEmptyState>
              ) : (
                rows.map((row) => (
                  <Tr key={row.area}>
                    <Td className="font-medium">{row.area}</Td>
                    <Td>{row.count}</Td>
                    <Td>{formatDuration(row.totalSeconds)}</Td>
                    <Td>{formatDuration(row.averageSeconds)}</Td>
                    <Td className="text-[var(--color-text-muted)]">{formatDateTime(row.lastCleaning)}</Td>
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
