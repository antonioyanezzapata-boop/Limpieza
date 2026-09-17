import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDashboardSummary } from '../api/dashboard'
import { ApiError } from '../api/client'
import type { DashboardSummary } from '../api/types'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Alert, EmptyState, PageLoading } from '../components/ui/Feedback'
import { KpiTile } from '../components/ui/KpiTile'
import { formatDate, formatDuration, formatTime } from '../lib/format'

const CHART_COLOR = '#1e6f5c'

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getDashboardSummary()
        if (!cancelled) setSummary(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (isLoading) return <PageLoading />
  if (error) return <Alert tone="error">{error}</Alert>
  if (!summary) return null

  const { kpis, charts, incompleteSessions } = summary

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Resumen de actividad de limpieza en tiempo real.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
        <KpiTile label="Personal activo hoy" value={kpis.activeStaffToday} />
        <KpiTile label="Áreas atendidas hoy" value={kpis.areasAttendedToday} />
        <KpiTile label="Limpiezas completadas" value={kpis.cleaningsCompletedToday} />
        <KpiTile label="Registros abiertos" value={kpis.openRecords} tone="warning" />
        <KpiTile label="Registros incompletos" value={kpis.incompleteRecords} tone="danger" />
        <KpiTile label="Tiempo promedio / área" value={formatDuration(kpis.averageSecondsPerArea)} />
        <KpiTile label="Tiempo total hoy" value={formatDuration(kpis.totalSecondsToday)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Limpiezas por área" />
          <CardBody>
            <ChartOrEmpty data={charts.cleaningsByArea}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={charts.cleaningsByArea} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5ea" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Limpiezas" fill={CHART_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartOrEmpty>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tiempo acumulado por área" description="Segundos totales" />
          <CardBody>
            <ChartOrEmpty data={charts.timeByArea}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={charts.timeByArea} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5ea" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatDuration(Number(value))} />
                  <Bar dataKey="value" name="Tiempo" fill="#2f8f77" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartOrEmpty>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Limpiezas por día" description="Últimos 7 días" />
          <CardBody>
            <ChartOrEmpty data={charts.cleaningsByDay}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={charts.cleaningsByDay} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e5ea" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value: string) => formatDate(value)}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(value) => formatDate(String(value))} />
                  <Line type="monotone" dataKey="value" name="Limpiezas" stroke={CHART_COLOR} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartOrEmpty>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Distribución de tiempo por usuario" />
          <CardBody>
            <ChartOrEmpty data={charts.timeByUser}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={charts.timeByUser}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e5ea" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatDuration(Number(value))} />
                  <Bar dataKey="value" name="Tiempo" fill="#4a9d8a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartOrEmpty>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Registros incompletos"
          description="Sesiones abiertas que requieren seguimiento"
        />
        <CardBody className="p-0">
          {incompleteSessions.length === 0 ? (
            <EmptyState title="No hay registros incompletos" description="Todo está al día." />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {incompleteSessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{session.area}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {session.user} · desde {formatTime(session.startedAt)} el {formatDate(session.startedAt)}
                    </p>
                  </div>
                  <Link
                    to={`/sessions/${session.id}`}
                    className="focus-ring rounded-md px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Ver detalle
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function ChartOrEmpty({
  data,
  children,
}: {
  data: { label: string; value: number }[]
  children: ReactNode
}) {
  if (data.length === 0) {
    return <EmptyState title="Sin datos" description="No hay información para este periodo." />
  }
  return <>{children}</>
}
