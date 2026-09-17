import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as areasApi from '../../api/areas'
import { ApiError, triggerBlobDownload } from '../../api/client'
import type { Area, QrCode } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Badge, statusTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { Alert, EmptyState, PageLoading, Spinner } from '../../components/ui/Feedback'
import { Table, Tbody, Td, TableEmptyState, Th, Thead, Tr } from '../../components/ui/Table'
import { formatDateTime, statusLabel } from '../../lib/format'

export function AreaQrPage() {
  const { id } = useParams<{ id: string }>()
  const { isAdmin } = useAuth()

  const [area, setArea] = useState<Area | null>(null)
  const [history, setHistory] = useState<QrCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const activeQr = history.find((qr) => qr.status === 'ACTIVE') ?? null

  const load = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const [areaData, qrHistory] = await Promise.all([areasApi.getArea(id), areasApi.listQrCodes(id)])
      setArea(areaData)
      setHistory([...qrHistory].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la información del área')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    async function loadImage() {
      if (!activeQr) {
        setQrImageUrl(null)
        return
      }
      setIsImageLoading(true)
      try {
        const { blob } = await areasApi.fetchQrPng(activeQr.id)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setQrImageUrl(objectUrl)
      } catch {
        if (!cancelled) setQrImageUrl(null)
      } finally {
        if (!cancelled) setIsImageLoading(false)
      }
    }
    void loadImage()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [activeQr])

  async function handleGenerate() {
    if (!id) return
    setIsGenerating(true)
    setError(null)
    try {
      await areasApi.generateQrCode(id)
      setConfirmOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo generar el código QR')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDownload(qr: QrCode) {
    try {
      const { blob, filename } = await areasApi.fetchQrPng(qr.id)
      triggerBlobDownload(blob, filename ?? `qr-${area?.code ?? qr.areaId}.png`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo descargar el código QR')
    }
  }

  function handlePrint() {
    if (!qrImageUrl) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head><title>QR - ${area?.name ?? ''}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;">
          <h2>${area?.name ?? ''} (${area?.code ?? ''})</h2>
          <img src="${qrImageUrl}" style="width:320px;height:320px;" onload="window.print()" />
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (isLoading) return <PageLoading />
  if (!area) return <Alert tone="error">{error ?? 'Área no encontrada'}</Alert>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Código QR — {area.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {area.code} {area.floor ? `· Piso ${area.floor}` : ''} {area.zone ? `· Zona ${area.zone}` : ''}
          </p>
        </div>
        <Link to={`/areas/${area.id}/edit`} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← Volver al área
        </Link>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="QR activo" />
          <CardBody className="flex flex-col items-center gap-4">
            <div className="flex h-56 w-56 items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-slate-50">
              {isImageLoading ? (
                <Spinner />
              ) : qrImageUrl ? (
                <img src={qrImageUrl} alt={`Código QR de ${area.name}`} className="h-full w-full object-contain p-2" />
              ) : (
                <span className="px-4 text-center text-sm text-[var(--color-text-muted)]">
                  Esta área no tiene un código QR activo.
                </span>
              )}
            </div>

            {activeQr && (
              <p className="break-all text-center text-xs text-[var(--color-text-muted)]">{activeQr.content}</p>
            )}

            <div className="flex w-full flex-wrap justify-center gap-2">
              {activeQr && (
                <>
                  <Button variant="outline" size="sm" onClick={() => void handleDownload(activeQr)}>
                    Descargar PNG
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint} disabled={!qrImageUrl}>
                    Imprimir
                  </Button>
                </>
              )}
              {isAdmin && (
                <Button size="sm" onClick={() => setConfirmOpen(true)}>
                  {activeQr ? 'Regenerar QR' : 'Generar QR'}
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Historial de códigos QR" description="Todos los códigos generados para esta área" />
          <Table>
            <Thead>
              <Tr>
                <Th>Estado</Th>
                <Th>Creado</Th>
                <Th>Revocado</Th>
                <Th>Token</Th>
                <Th>Acciones</Th>
              </Tr>
            </Thead>
            <Tbody>
              {history.length === 0 ? (
                <TableEmptyState colSpan={5}>
                  <EmptyState title="Sin códigos QR" description="Genere el primer código QR para esta área." />
                </TableEmptyState>
              ) : (
                history.map((qr) => (
                  <Tr key={qr.id}>
                    <Td>
                      <Badge tone={statusTone(qr.status)}>{statusLabel(qr.status)}</Badge>
                    </Td>
                    <Td>{formatDateTime(qr.createdAt)}</Td>
                    <Td>{formatDateTime(qr.revokedAt)}</Td>
                    <Td className="max-w-[220px] truncate font-mono text-xs" title={qr.token}>
                      {qr.token}
                    </Td>
                    <Td>
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                        onClick={() => void handleDownload(qr)}
                      >
                        Descargar
                      </button>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Card>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={activeQr ? 'Regenerar código QR' : 'Generar código QR'}
        description={
          activeQr
            ? 'Se generará un nuevo código QR y el actual quedará revocado de inmediato. Los rótulos impresos con el código anterior dejarán de funcionar.'
            : 'Se generará el primer código QR activo para esta área.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleGenerate()} isLoading={isGenerating}>
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-text-muted)]">
          Esta acción queda registrada en el historial de auditoría.
        </p>
      </Dialog>
    </div>
  )
}
