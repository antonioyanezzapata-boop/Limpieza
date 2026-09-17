import { cn } from '../../lib/cn'

export interface TabItem {
  key: string
  label: string
}

export function Tabs({
  items,
  activeKey,
  onChange,
}: {
  items: TabItem[]
  activeKey: string
  onChange: (key: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)]" role="tablist">
      {items.map((item) => {
        const isActive = item.key === activeKey
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={cn(
              'focus-ring -mb-px rounded-t-md border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
