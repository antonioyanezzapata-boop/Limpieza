import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as reportsApi from '../../api/reports'
import { ApiError, triggerBlobDownload } from '../../api/client'
import type { AdminUser, Area, CleaningTimesReport, ExportFormat, ReportFilters } from '../../api/types'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { Alert, EmptyState, PageLoading } from '../../components/ui/Feedback'
import { KpiTile } from '../../components/ui/KpiTile'
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '../../components/ui/Table'
import { formatDuration, statusLabel } from '../../lib/format'
import { ReportFiltersForm } from './ReportFiltersForm'

const EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'xlsx', label: 'Exportar XLSX' },
  { format: 'csv', label: 'Exportar CSV' },
  { format: 'pdf', label: 'Exportar PDF' },
]

export function CleaningTimesTab({ areas, users }: { areas: Area[]; users: AdminUser[] }) {
  const [filters, setFilters] = useState<ReportFilters>({})
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>({})
  const [report, setReport] = useState<CleaningTimesReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await reportsApi.getCleaningTimesReport(appliedFilters)
        if (!cancelled) setReport(data)
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

  async function handleExport(format: ExportFormat) {
    setExportingFormat(format)
    setError(null)
    try {
      const { blob, filename } = await reportsApi.exportCleaningTimes(format, appliedFilters)
      triggerBlobDownload(blob, filename)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo exportar el reporte')
    } finally {
      setExportingFormat(null)
    }
  }

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
            extraActions={
              <div className="flex flex-wrap gap-2">
                {EXPORT_FORMATS.map(({ format, label }) => (
                  <Button
                    key={format}
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={exportingFormat === format}
                    onClick={() => void handleExport(format)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            }
          />
        </CardBody>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      {isLoading ? (
        <PageLoading />
      ) : report ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile label="Total registros" value={report.summary.totalRegistros} />
            <KpiTile label="Horas totales" value={formatDuration(report.summary.totalHorasSegundos)} />
            <KpiTile label="Áreas atendidas" value={report.summary.areasAtendidas} />
            <KpiTile label="Usuarios participantes" value={report.summary.usuariosParticipantes} />
            <KpiTile label="Abiertos" value={report.summary.registrosAbiertos} tone="warning" />
            <KpiTile label="Inconsistentes" value={report.summary.registrosInconsistentes} tone="danger" />
          </div>

          <Card>
            <Table>
              <Thead>
                <Tr>
                  <Th>Fecha</Th>
                  <Th>Usuario</Th>
                  <Th>Área</Th>
                  <Th>Piso / Zona</Th>
                  <Th>Entrada</Th>
                  <Th>Salida</Th>
                  <Th>Duración</Th>
                  <Th>Estado</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {report.rows.length === 0 ? (
                  <TableEmptyState colSpan={9}>
                    <EmptyState title="Sin registros" description="No hay datos para los filtros seleccionados." />
                  </TableEmptyState>
                ) : (
                  report.rows.map((row) => (
                    <Tr key={row.sessionId}>
                      <Td>{row.fecha}</Td>
                      <Td>
                        {row.nombreUsuario}
                        <div className="text-xs text-[var(--color-text-muted)]">{row.codigoUsuario}</div>
                      </Td>
                      <Td>{row.area}</Td>
                      <Td className="text-[var(--color-text-muted)]">
                        {[row.piso, row.zona].filter(Boolean).join(' / ') || '—'}
                      </Td>
                      <Td>{row.horaEntrada ?? '—'}</Td>
                      <Td>{row.horaSalida ?? '—'}</Td>
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
                          Ver / Corregir
                        </Link>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Card>
        </>
      ) : null}
    </div>
  )
}
