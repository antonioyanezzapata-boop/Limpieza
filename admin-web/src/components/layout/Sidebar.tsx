import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { navItems } from './navConfig'
import { NavIcon } from './NavIcon'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex h-full flex-col bg-[var(--color-sidebar-bg)] text-[var(--color-sidebar-fg)]">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-sidebar-active-bg)] text-sm font-bold text-white">
          HC
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Trazabilidad</p>
          <p className="text-xs text-[var(--color-sidebar-fg)]">Limpieza hospitalaria</p>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'focus-ring flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-sidebar-active-bg)] text-[var(--color-sidebar-fg-active)]'
                  : 'text-[var(--color-sidebar-fg)] hover:bg-[var(--color-sidebar-active-bg)]/60 hover:text-white',
              )
            }
          >
            <NavIcon icon={item.icon} className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
