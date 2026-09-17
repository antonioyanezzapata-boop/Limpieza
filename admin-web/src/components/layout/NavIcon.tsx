import type { NavItem } from './navConfig'

const paths: Record<NavItem['icon'], string> = {
  dashboard: 'M3 13h4v8H3v-8Zm7-9h4v17h-4V4Zm7 6h4v11h-4V10Z',
  users: 'M16 11a4 4 0 1 0-4-4M8 11a4 4 0 1 0 0-8M2 20c0-3.3 2.7-6 6-6h1M14 14h1c3.3 0 6 2.7 6 6',
  areas: 'M3 9.5 12 3l9 6.5V21H3V9.5Zm5 11.5v-7h8v7',
  reports: 'M4 19V5m5 14V9m5 10V13m5 6V7',
  alert: 'M12 3 2 20h20L12 3Zm0 6v5m0 3h.01',
  audit: 'M9 3h6l1 3h3v2H2V6h3l1-3ZM6 8v13h12V8M9 12v5m6-5v5',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.4 4a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.3.9a7.6 7.6 0 0 0-2-1.2L15.6 3H8.4l-.4 2.5a7.6 7.6 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2l.4 2.5h7.2l.4-2.5c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
}

export function NavIcon({ icon, className }: { icon: NavItem['icon']; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[icon]} />
    </svg>
  )
}
