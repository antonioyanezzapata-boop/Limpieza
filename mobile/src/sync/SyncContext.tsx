import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { ApiError, getAuthTokens } from '../api/client';
import { syncBatch } from '../api/endpoints';
import {
  type QueueItem,
  getAllQueueItems,
  getSyncableItems,
  markItemError,
  markItemSynced,
  markItemsSyncing,
  resetStuckSyncingItems,
} from '../db/queueStorage';
import { useNetwork } from '../network/NetworkContext';

/**
 * Drives the offline queue -> POST /sync/batch flow. Triggers automatically
 * when connectivity returns and when the app comes to the foreground, and
 * exposes `syncNow` for the manual "Sincronizar ahora" button.
 */

interface SyncContextValue {
  items: QueueItem[];
  pendingCount: number;
  isSyncing: boolean;
  lastError: string | null;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isConnected } = useNetwork();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  // Guards against overlapping syncs (reconnect event + foreground event firing close together, etc).
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    const all = await getAllQueueItems();
    setItems(all);
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    if (!getAuthTokens().accessToken) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setLastError(null);
    try {
      const syncable = await getSyncableItems();
      if (syncable.length === 0) return;

      // Mark as syncing immediately so a concurrent trigger never re-sends these.
      await markItemsSyncing(syncable.map((i) => i.clientUuid));
      await refresh();

      try {
        const results = await syncBatch(syncable.map((i) => i.payload));
        await Promise.all(
          results.map((r) =>
            r.success
              ? markItemSynced(r.clientUuid)
              : markItemError(r.clientUuid, r.error ?? 'Error al sincronizar este registro.'),
          ),
        );
      } catch (err) {
        // The whole batch call failed (network/HTTP level, not per-item): put everything
        // back to 'error' so it stays visible and is retried on the next sync.
        const message =
          err instanceof ApiError
            ? err.isNetworkError
              ? 'Sin conexión con el servidor.'
              : err.message
            : 'No se pudo sincronizar.';
        await Promise.all(syncable.map((i) => markItemError(i.clientUuid, message)));
        setLastError(message);
      }
    } finally {
      await refresh();
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    resetStuckSyncingItems()
      .then(refresh)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isConnected) {
      syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && isConnected) {
        syncNow();
      }
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const pendingCount = items.filter((i) => i.status !== 'synced').length;

  const value: SyncContextValue = { items, pendingCount, isSyncing, lastError, refresh, syncNow };
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
