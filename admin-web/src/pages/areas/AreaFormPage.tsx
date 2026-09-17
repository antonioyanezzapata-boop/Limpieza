import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as areasApi from '../../api/areas'
import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { FormRow, Input, Label, Textarea } from '../../components/ui/Field'
import { Alert, PageLoading } from '../../components/ui/Feedback'

interface FormState {
  code: string
  name: string
  floor: string
  zone: string
  description: string
}

const emptyForm: FormState = { code: '', name: '', floor: '', zone: '', description: '' }

export function AreaFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [isLoading, setIsLoading] = useState(isEdit)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const area = await areasApi.getArea(id as string)
        if (cancelled) return
        setForm({
          code: area.code,
          name: area.name,
          floor: area.floor ?? '',
          zone: area.zone ?? '',
          description: area.description ?? '',
        })
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el área')
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
      const payload = {
        code: form.code,
        name: form.name,
        floor: form.floor || undefined,
        zone: form.zone || undefined,
        description: form.description || undefined,
      }
      if (isEdit && id) {
        await areasApi.updateArea(id, payload)
      } else {
        await areasApi.createArea(payload)
      }
      navigate('/areas')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el área')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          {isEdit ? 'Editar área' : 'Crear área'}
        </h1>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardHeader title="Datos del área" />
        <CardBody>
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label htmlFor="code" required>
                  Código
                </Label>
                <Input id="code" required value={form.code} onChange={(e) => update('code', e.target.value)} />
              </FormRow>
              <FormRow>
                <Label htmlFor="name" required>
                  Nombre
                </Label>
                <Input id="name" required value={form.name} onChange={(e) => update('name', e.target.value)} />
              </FormRow>
              <FormRow>
                <Label htmlFor="floor">Piso</Label>
                <Input id="floor" value={form.floor} onChange={(e) => update('floor', e.target.value)} />
              </FormRow>
              <FormRow>
                <Label htmlFor="zone">Zona</Label>
                <Input id="zone" value={form.zone} onChange={(e) => update('zone', e.target.value)} />
              </FormRow>
            </div>
            <FormRow>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </FormRow>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {isEdit && id && (
                <Link to={`/areas/${id}/qr`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
                  Gestionar código QR →
                </Link>
              )}
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/areas')}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {isEdit ? 'Guardar cambios' : 'Crear área'}
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
