import { useState } from 'react'
import type { FormEvent } from 'react'
import * as usersApi from '../../api/users'
import { ApiError } from '../../api/client'
import type { AdminUser } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { FormRow, HelpText, Input, Label } from '../../components/ui/Field'
import { Alert } from '../../components/ui/Feedback'

export function ResetPasswordDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await usersApi.resetPassword(user.id, newPassword)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Restablecer contraseña"
      description={`${user.firstName} ${user.lastName} (${user.employeeCode})`}
    >
      {success ? (
        <div className="space-y-4">
          <Alert tone="success">Contraseña actualizada correctamente.</Alert>
          <div className="flex justify-end">
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-3">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          <FormRow>
            <Label htmlFor="newPassword" required>
              Nueva contraseña
            </Label>
            <Input
              id="newPassword"
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
            <HelpText>Mínimo 8 caracteres. Se recomienda combinar letras, números y símbolos.</HelpText>
          </FormRow>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Guardar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
