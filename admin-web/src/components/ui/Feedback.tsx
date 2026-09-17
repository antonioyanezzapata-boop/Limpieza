import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]',
        className,
      )}
      role="status"
      aria-label="Cargando"
    />
  )
}

export function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner />
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>}
    </div>
  )
}

type AlertTone = 'error' | 'success' | 'warning' | 'info'

const alertClasses: Record<AlertTone, string> = {
  error: 'bg-red-50 text-[var(--color-danger)] border-red-200',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-green-200',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-amber-200',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-blue-200',
}

export function Alert({ tone = 'info', children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <div className={cn('rounded-md border px-3.5 py-2.5 text-sm', alertClasses[tone])} role="alert">
      {children}
    </div>
  )
}
