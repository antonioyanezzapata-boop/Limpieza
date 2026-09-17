import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function KpiTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'warning' | 'danger'
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold',
          tone === 'warning' && 'text-[var(--color-warning)]',
          tone === 'danger' && 'text-[var(--color-danger)]',
          tone === 'default' && 'text-[var(--color-text)]',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  )
}
