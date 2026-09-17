export interface NavItem {
  to: string
  label: string
  icon: 'dashboard' | 'users' | 'areas' | 'reports' | 'alert' | 'audit' | 'settings'
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/users', label: 'Usuarios', icon: 'users' },
  { to: '/areas', label: 'Áreas', icon: 'areas' },
  { to: '/reports', label: 'Reportes', icon: 'reports' },
  { to: '/sessions/inconsistent', label: 'Registros inconsistentes', icon: 'alert' },
  { to: '/audit', label: 'Auditoría', icon: 'audit' },
  { to: '/settings', label: 'Configuración', icon: 'settings' },
]
