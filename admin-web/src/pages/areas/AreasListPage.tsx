import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as areasApi from '../../api/areas'
import { ApiError } from '../../api/client'
import type { Area, UserStatus } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Button, LinkButton } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Field'
import { Alert, EmptyState, PageLoading } from '../../components/ui/Feedback'
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '../../components/ui/Table'
import { statusLabel } from '../../lib/format'

export function AreasListPage() {
  const { isAdmin } = useAuth()
  const [areas, setAreas] = useState<Area[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [floor, setFloor] = useState('')
  const [zone, setZone] = useState('')

  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await areasApi.listAreas({
        search: search || undefined,
        status: status || undefined,
        floor: floor || undefined,
        zone: zone || undefined,
      })
      setAreas(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las áreas')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault()
    void load()
  }

  async function toggleStatus(area: Area) {
    setBusyId(area.id)
    try {
      if (area.status === 'ACTIVE') {
        await areasApi.deactivateArea(area.id)
      } else {
        await areasApi.activateArea(area.id)
      }
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado del área')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Áreas</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Áreas hospitalarias y sus códigos QR asociados.
          </p>
        </div>
        {isAdmin && <LinkButton to="/areas/new">Crear área</LinkButton>}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardBody>
          <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            <Input
              placeholder="Buscar por código o nombre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:col-span-2"
            />
            <Input placeholder="Piso" value={floor} onChange={(e) => setFloor(e.target.value)} />
            <Input placeholder="Zona" value={zone} onChange={(e) => setZone(e.target.value)} />
            <Select value={status} onChange={(e) => setStatus(e.target.value as UserStatus | '')}>
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </Select>
            <div className="sm:col-span-5">
              <Button type="submit" variant="secondary">
                Filtrar
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        {isLoading ? (
          <PageLoading />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Código</Th>
                <Th>Nombre</Th>
                <Th>Piso</Th>
                <Th>Zona</Th>
                <Th>Estado</Th>
                <Th>QR activo</Th>
                <Th>Acciones</Th>
              </Tr>
            </Thead>
            <Tbody>
              {areas.length === 0 ? (
                <TableEmptyState colSpan={7}>
                  <EmptyState title="Sin resultados" description="Ajuste los filtros de búsqueda." />
                </TableEmptyState>
              ) : (
                areas.map((area) => {
                  const activeQr = area.qrCodes.find((qr) => qr.status === 'ACTIVE') ?? area.qrCodes[0]
                  return (
                    <Tr key={area.id}>
                      <Td className="font-medium">{area.code}</Td>
                      <Td>
                        {isAdmin ? (
                          <Link
                            to={`/areas/${area.id}/edit`}
                            className="text-[var(--color-primary)] hover:underline"
                          >
                            {area.name}
                          </Link>
                        ) : (
                          area.name
                        )}
                      </Td>
                      <Td>{area.floor ?? '—'}</Td>
                      <Td>{area.zone ?? '—'}</Td>
                      <Td>
                        <Badge tone={statusTone(area.status)}>{statusLabel(area.status)}</Badge>
                      </Td>
                      <Td>
                        {activeQr ? (
                          <Badge tone={activeQr.status === 'ACTIVE' ? 'success' : 'neutral'}>
                            {statusLabel(activeQr.status)}
                          </Badge>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">Sin QR</span>
                        )}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/areas/${area.id}/qr`}
                            className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                          >
                            Gestionar QR
                          </Link>
                          {isAdmin && (
                            <>
                              <Link
                                to={`/areas/${area.id}/edit`}
                                className="text-xs font-medium text-[var(--color-text-muted)] hover:underline"
                              >
                                Editar
                              </Link>
                              <button
                                type="button"
                                disabled={busyId === area.id}
                                className="text-xs font-medium text-[var(--color-danger)] hover:underline disabled:opacity-50"
                                onClick={() => void toggleStatus(area)}
                              >
                                {area.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                              </button>
                            </>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  )
                })
              )}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
