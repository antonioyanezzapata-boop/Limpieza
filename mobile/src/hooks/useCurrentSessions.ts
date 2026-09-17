import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ApiError } from '../api/client';
import { getCurrentSessions } from '../api/endpoints';
import type { CurrentSessionItem } from '../api/types';

interface UseCurrentSessionsResult {
  sessions: CurrentSessionItem[];
  /** Timestamp (ms) this data was fetched at, so screens can compute live elapsed time. */
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Fetches GET /access-events/current, refreshing every time the screen regains focus. */
export function useCurrentSessions(): UseCurrentSessionsResult {
  const [sessions, setSessions] = useState<CurrentSessionItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCurrentSessions();
      setSessions(data);
      setFetchedAt(Date.now());
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        setError('Sin conexión: no se puede consultar la actividad actual en este momento.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo cargar la actividad actual.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return { sessions, fetchedAt, loading, error, refetch };
}
