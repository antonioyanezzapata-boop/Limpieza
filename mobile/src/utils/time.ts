/** Formats a duration in seconds as "1h 5min" / "45min" / "30s". */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) {
    return '--';
  }
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}min`;
  }
  return `${secs}s`;
}

/** Formats an ISO timestamp as a local HH:MM string. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Formats an ISO timestamp as a local date + time string. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString([], {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const HISTORY_RANGE_LABELS: Record<'today' | 'yesterday' | 'week' | 'month', string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Semana',
  month: 'Mes',
};
