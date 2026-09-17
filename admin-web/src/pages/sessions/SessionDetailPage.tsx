import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as accessEventsApi from '../../api/accessEvents'
import * as areasApi from '../../api/areas'
import * as reportsApi from '../../api/reports'
import { ApiError } from '../../api/client'
import type { Area, CleaningTimeRow } from '../../api/types'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { FormRow, Label, Select, Textarea } from '../../components/ui/Field'
import { Alert, PageLoading } from '../../components/ui/Feedback'
import { formatDuration, isoToLocalDateTimeInput, localDateTimeToIso, statusLabel } from '../../lib/format'

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const [row, setRow] = useState<CleaningTimeRow | null>(
    (location.state as { row?: CleaningTimeRow } | null)?.row ?? null,
  )
  const [areas, setAreas] = useState<Area[]>([])
  const [isLoading, setIsLoading] = useState(!row)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [entryLocal, setEntryLocal] = useState('')
  const [exitLocal, setExitLocal] = useState('')
  const [areaId, setAreaId] = useState('')
  const [observations, setObservations] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const areaList = await areasApi.listAreas()
        if (!cancelled) setAreas(areaList)
      } catch {
        // area dropdown just stays empty; correction can still be submitted for other fields
      }

      if (!row && id) {
        setIsLoading(true)
        try {
          const report = await reportsApi.getCleaningTimesReport({})
          const found = report.rows.find((r) => r.sessionId === id)
          if (!cancelled) {
            if (found) setRow(found)
            else setLoadError('No se encontró la sesión solicitada.')
          }
        } catch (err) {
          if (!cancelled) {
            setLoadError(err instanceof ApiError ? err.message : 'No se pudo cargar la sesión')
          }
        } finally {
          if (!cancelled) setIsLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!row) return
    setEntryLocal(isoToLocalDateTimeInput(row.horaEntrada))
    setExitLocal(isoToLocalDateTimeInput(row.horaSalida))
    setObservations(row.observacion ?? '')
    const matchedArea = areas.find((a) => a.name === row.area || a.code === row.area)
    setAreaId(matchedArea?.id ?? '')
  }, [row, areas])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!reason.trim()) {
      setFormError('El motivo de modificación es obligatorio.')
      return
    }
    if (!id) return

    setIsSubmitting(true)
    try {
      await accessEventsApi.correctSession(id, {
        entryTimestamp: localDateTimeToIso(entryLocal),
        exitTimestamp: localDateTimeToIso(exitLocal),
        areaId: areaId || undefined,
        observations: observations || undefined,
        reason: reason.trim(),
      })
      setSuccessMessage('La sesión fue corregida correctamente.')
      setReason('')
      try {
        const report = await reportsApi.getCleaningTimesReport({})
        const updated = report.rows.find((r) => r.sessionId === id)
        if (updated) setRow(updated)
      } catch {
        // best-effort refresh
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo guardar la corrección')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <PageLoading />
  if (loadError || !row) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{loadError ?? 'Sesión no encontrada'}</Alert>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Detalle de sesión</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{row.fecha}</p>
        </div>
        <Badge tone={statusTone(row.estado)}>{statusLabel(row.estado)}</Badge>
      </div>

      <Card>
        <CardHeader title="Información de la sesión" />
        <CardBody>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info label="Usuario" value={`${row.nombreUsuario} (${row.codigoUsuario})`} />
            <Info label="Área" value={row.area} />
            <Info label="Piso / Zona" value={[row.piso, row.zona].filter(Boolean).join(' / ') || '—'} />
            <Info label="Estado" value={statusLabel(row.estado)} />
            <Info label="Hora de entrada" value={row.horaEntrada ?? '—'} />
            <Info label="Hora de salida" value={row.horaSalida ?? '—'} />
            <Info label="Duración" value={row.duracion ?? formatDuration(row.duracionSegundos)} />
            <Info label="Observaciones" value={row.observacion ?? '—'} />
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Corregir registro"
          description="Toda corrección requiere un motivo y queda registrada en la auditoría."
        />
        <CardBody>
          {formError && (
            <div className="mb-4">
              <Alert tone="error">{formError}</Alert>
            </div>
          )}
          {successMessage && (
            <div className="mb-4">
              <Alert tone="success">{successMessage}</Alert>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormRow>
                <Label htmlFor="entryLocal">Hora de entrada</Label>
                <input
                  id="entryLocal"
                  type="datetime-local"
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-ring"
                  value={entryLocal}
                  onChange={(e) => setEntryLocal(e.target.value)}
                />
              </FormRow>
              <FormRow>
                <Label htmlFor="exitLocal">Hora de salida</Label>
                <input
                  id="exitLocal"
                  type="datetime-local"
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-ring"
                  value={exitLocal}
                  onChange={(e) => setExitLocal(e.target.value)}
                />
              </FormRow>
              <FormRow className="sm:col-span-2">
                <Label htmlFor="areaId">Área</Label>
                <Select id="areaId" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                  <option value="">Sin cambios</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.code} — {area.name}
                    </option>
                  ))}
                </Select>
              </FormRow>
              <FormRow className="sm:col-span-2">
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </FormRow>
              <FormRow className="sm:col-span-2">
                <Label htmlFor="reason" required>
                  Motivo de modificación
                </Label>
                <Textarea
                  id="reason"
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explique por qué se corrige este registro"
                />
              </FormRow>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Volver
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Guardar corrección
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--color-text)]">{value}</dd>
    </div>
  )
}
