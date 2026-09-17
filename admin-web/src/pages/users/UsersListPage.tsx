import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as usersApi from '../../api/users'
import { ApiError } from '../../api/client'
import type { AdminUser, Role, UserStatus } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Button, LinkButton } from '../../components/ui/Button'
import { Card, CardBody } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Field'
import { Alert, EmptyState, PageLoading } from '../../components/ui/Feedback'
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '../../components/ui/Table'
import { formatDateTime, roleLabel, statusLabel } from '../../lib/format'
import { ResetPasswordDialog } from './ResetPasswordDialog'

export function UsersListPage() {
  const { isAdmin } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [role, setRole] = useState<Role | ''>('')

  const [busyId, setBusyId] = useState<string | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null)

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await usersApi.listUsers({
        search: search || undefined,
        status: status || undefined,
        role: role || undefined,
      })
      setUsers(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los usuarios')
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

  async function toggleStatus(user: AdminUser) {
    setBusyId(user.id)
    try {
      if (user.status === 'ACTIVE') {
        await usersApi.deactivateUser(user.id)
      } else {
        await usersApi.activateUser(user.id)
      }
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado del usuario')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Usuarios</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Personal administrativo, supervisores y personal de limpieza.
          </p>
        </div>
        {isAdmin && <LinkButton to="/users/new">Crear usuario</LinkButton>}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardBody>
          <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Input
              placeholder="Buscar por nombre, código o email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:col-span-2"
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value as UserStatus | '')}>
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </Select>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role | '')}>
              <option value="">Todos los roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="CLEANING_STAFF">Personal de limpieza</option>
            </Select>
            <div className="sm:col-span-4">
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
                <Th>Email</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th>Último acceso</Th>
                {isAdmin && <Th>Acciones</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {users.length === 0 ? (
                <TableEmptyState colSpan={isAdmin ? 7 : 6}>
                  <EmptyState title="Sin resultados" description="Ajuste los filtros de búsqueda." />
                </TableEmptyState>
              ) : (
                users.map((user) => (
                  <Tr key={user.id}>
                    <Td className="font-medium">{user.employeeCode}</Td>
                    <Td>
                      {isAdmin ? (
                        <Link to={`/users/${user.id}/edit`} className="text-[var(--color-primary)] hover:underline">
                          {user.firstName} {user.lastName}
                        </Link>
                      ) : (
                        `${user.firstName} ${user.lastName}`
                      )}
                    </Td>
                    <Td>{user.email}</Td>
                    <Td>{roleLabel(user.role.name)}</Td>
                    <Td>
                      <Badge tone={statusTone(user.status)}>{statusLabel(user.status)}</Badge>
                    </Td>
                    <Td className="text-[var(--color-text-muted)]">{formatDateTime(user.lastLoginAt)}</Td>
                    {isAdmin && (
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/users/${user.id}/edit`}
                            className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            className="text-xs font-medium text-[var(--color-text-muted)] hover:underline"
                            onClick={() => setResetPasswordUser(user)}
                          >
                            Restablecer contraseña
                          </button>
                          <button
                            type="button"
                            disabled={busyId === user.id}
                            className="text-xs font-medium text-[var(--color-danger)] hover:underline disabled:opacity-50"
                            onClick={() => void toggleStatus(user)}
                          >
                            {user.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </Td>
                    )}
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        )}
      </Card>

      {resetPasswordUser && (
        <ResetPasswordDialog user={resetPasswordUser} onClose={() => setResetPasswordUser(null)} />
      )}
    </div>
  )
}
