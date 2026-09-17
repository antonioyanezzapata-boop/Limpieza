import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as usersApi from '../../api/users'
import { ApiError } from '../../api/client'
import type { AdminUser, Role } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { FormRow, HelpText, Input, Label, Select } from '../../components/ui/Field'
import { Alert, PageLoading } from '../../components/ui/Feedback'

interface FormState {
  firstName: string
  lastName: string
  identification: string
  employeeCode: string
  email: string
  phone: string
  role: Role
  password: string
}

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  identification: '',
  employeeCode: '',
  email: '',
  phone: '',
  role: 'CLEANING_STAFF',
  password: '',
}

export function UserFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [original, setOriginal] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const user = await usersApi.getUser(id as string)
        if (cancelled) return
        setOriginal(user)
        setForm({
          firstName: user.firstName,
          lastName: user.lastName,
          identification: user.identification,
          employeeCode: user.employeeCode,
          email: user.email,
          phone: user.phone ?? '',
          role: user.role.name,
          password: '',
        })
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el usuario')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (isEdit && id) {
        await usersApi.updateUser(id, {
          firstName: form.firstName,
          lastName: form.lastName,
          identification: form.identification,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
        })
      } else {
        await usersApi.createUser({
          firstName: form.firstName,
          lastName: form.lastName,
          identification: form.identification,
          employeeCode: form.employeeCode,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
          password: form.password,
        })
      }
      navigate('/users')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {isEdit ? 'Editar usuario' : 'Crear usuario'}
        </h1>
        {original && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Código de empleado: {original.employeeCode}
          </p>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardHeader title="Datos del usuario" />
        <CardBody>
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label htmlFor="firstName" required>
                  Nombres
                </Label>
                <Input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                />
              </FormRow>
              <FormRow>
                <Label htmlFor="lastName" required>
                  Apellidos
                </Label>
                <Input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                />
              </FormRow>
              <FormRow>
                <Label htmlFor="identification" required>
                  Identificación
                </Label>
                <Input
                  id="identification"
                  required
                  value={form.identification}
                  onChange={(e) => update('identification', e.target.value)}
                />
              </FormRow>
              <FormRow>
                <Label htmlFor="employeeCode" required>
                  Código de empleado
                </Label>
                <Input
                  id="employeeCode"
                  required
                  disabled={isEdit}
                  value={form.employeeCode}
                  onChange={(e) => update('employeeCode', e.target.value)}
                />
                {isEdit && <HelpText>El código de empleado no se puede modificar.</HelpText>}
              </FormRow>
              <FormRow>
                <Label htmlFor="email" required>
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </FormRow>
              <FormRow>
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
              </FormRow>
              <FormRow>
                <Label htmlFor="role" required>
                  Rol
                </Label>
                <Select
                  id="role"
                  required
                  value={form.role}
                  onChange={(e) => update('role', e.target.value as Role)}
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="CLEANING_STAFF">Personal de limpieza</option>
                </Select>
              </FormRow>
              {!isEdit && (
                <FormRow>
                  <Label htmlFor="password" required>
                    Contraseña inicial
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                  />
                </FormRow>
              )}
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/users')}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {isEdit ? 'Guardar cambios' : 'Crear usuario'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
