import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { getHistory } from '../api/endpoints';
import type { HistoryRange, HistoryResponse } from '../api/types';

interface UseHistoryResult {
  data: HistoryResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useHistory(range: HistoryRange): UseHistoryResult {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHistory(range);
      setData(res);
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        setError('Sin conexión: el historial no está disponible sin conexión.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo cargar el historial.');
      }
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
