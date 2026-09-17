import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Alert } from '../../components/ui/Feedback'
import { roleLabel } from '../../lib/format'

const DENSITY_KEY = 'admin-web.tableDensity'

type Density = 'comfortable' | 'compact'

function readDensity(): Density {
  try {
    const stored = localStorage.getItem(DENSITY_KEY)
    return stored === 'compact' ? 'compact' : 'comfortable'
  } catch {
    return 'comfortable'
  }
}

export function SettingsPage() {
  const { user } = useAuth()
  const [density, setDensity] = useState<Density>(readDensity)

  useEffect(() => {
    try {
      localStorage.setItem(DENSITY_KEY, density)
    } catch {
      // ignore storage failures; this is a local display preference only
    }
  }, [density])

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Configuración</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Preferencias del panel administrativo para este equipo.
        </p>
      </div>

      <Card>
        <CardHeader title="Sesión actual" />
        <CardBody className="space-y-2 text-sm">
          <p>
            <span className="font-medium text-[var(--color-text)]">Usuario:</span>{' '}
            {user ? `${user.firstName} ${user.lastName}` : '—'}
          </p>
          <p>
            <span className="font-medium text-[var(--color-text)]">Rol:</span>{' '}
            {user ? roleLabel(user.role) : '—'}
          </p>
          <p>
            <span className="font-medium text-[var(--color-text)]">Código de empleado:</span>{' '}
            {user?.employeeCode ?? '—'}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Conexión con el servidor" description="Definida por la variable de entorno VITE_API_URL" />
        <CardBody>
          <code className="block rounded-md bg-slate-100 px-3 py-2 text-sm text-[var(--color-text)]">
            {API_BASE_URL}
          </code>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Para cambiarla, defina <code>VITE_API_URL</code> en el archivo <code>.env</code> del proyecto y vuelva a
            compilar o reiniciar el servidor de desarrollo.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Captura de geolocalización" />
        <CardBody className="space-y-3">
          <Alert tone="info">
            La captura de geolocalización en el registro de accesos se controla desde el servidor mediante la
            variable de entorno <code>GEOLOCATION_ENABLED</code> del backend. Este panel no puede activarla ni
            desactivarla; contacte al equipo de infraestructura para modificarla.
          </Alert>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Densidad de tablas" description="Preferencia de visualización guardada en este navegador" />
        <CardBody>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="density"
                checked={density === 'comfortable'}
                onChange={() => setDensity('comfortable')}
              />
              Cómoda
            </label>
            <label className="ml-4 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="density"
                checked={density === 'compact'}
                onChange={() => setDensity('compact')}
              />
              Compacta
            </label>
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Esta preferencia solo se guarda en este navegador y no afecta a otros usuarios.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
