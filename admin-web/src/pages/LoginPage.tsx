import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'
import { Button } from '../components/ui/Button'
import { FormRow, Input, Label } from '../components/ui/Field'
import { Alert } from '../components/ui/Feedback'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [emailOrEmployeeCode, setEmailOrEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(emailOrEmployeeCode, password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? 'Credenciales inválidas. Verifique el usuario y la contraseña.'
            : err.message,
        )
      } else {
        setError('No se pudo conectar con el servidor. Intente nuevamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-sidebar-bg)] px-4">
      <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary)] text-lg font-bold text-white">
            HC
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">Panel administrativo</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Trazabilidad de limpieza hospitalaria
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <FormRow>
            <Label htmlFor="emailOrEmployeeCode" required>
              Correo o código de empleado
            </Label>
            <Input
              id="emailOrEmployeeCode"
              name="emailOrEmployeeCode"
              autoComplete="username"
              value={emailOrEmployeeCode}
              onChange={(e) => setEmailOrEmployeeCode(e.target.value)}
              placeholder="admin@hospital.local"
              required
            />
          </FormRow>
          <FormRow>
            <Label htmlFor="password" required>
              Contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </FormRow>
          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            Ingresar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
          Solo personal ADMIN y SUPERVISOR puede acceder a este panel.
        </p>
      </div>
    </div>
  )
}
