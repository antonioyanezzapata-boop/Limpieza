import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold text-[var(--color-text)]">Página no encontrada</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        La página que busca no existe o fue movida.
      </p>
      <Link to="/">
        <Button>Volver al dashboard</Button>
      </Link>
    </div>
  )
}
