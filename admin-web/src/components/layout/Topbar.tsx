import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { roleLabel } from '../../lib/format'
import { Button } from '../ui/Button'

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : ''

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="focus-ring -ml-1 rounded-md p-2 text-[var(--color-text)] lg:hidden"
        aria-label="Abrir menú"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="hidden sm:block" />
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-[var(--color-text)]">
            {user ? `${user.firstName} ${user.lastName}` : ''}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">{user ? roleLabel(user.role) : ''}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
          {initials}
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} isLoading={loggingOut}>
          Salir
        </Button>
      </div>
    </header>
  )
}
