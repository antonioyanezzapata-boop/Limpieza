import type { AccessEventRequest } from '../api/types';
import { decryptPayload, encryptPayload } from './crypto';
import { getDatabase } from './db';

/**
 * Local, encrypted offline queue for access-events that could not reach the
 * backend immediately (no connectivity, or a network-level failure). Backed
 * by expo-sqlite so it survives app restarts.
 *
 * Only non-sensitive, purely cosmetic fields (area name, event type, status)
 * are stored in the clear so the sync-status screen can list items without
 * decrypting; the full request payload sent to the server is AES-encrypted.
 */

export type QueueItemStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface QueueItem {
  id: number;
  clientUuid: string;
  areaName: string;
  eventType: 'ENTRY' | 'EXIT';
  createdAt: string;
  status: QueueItemStatus;
  errorMessage: string | null;
}

interface QueueRow {
  id: number;
  clientUuid: string;
  areaName: string;
  eventType: string;
  createdAt: string;
  status: string;
  errorMessage: string | null;
  payloadCipher: string;
}

function rowToItem(row: QueueRow): QueueItem {
  return {
    id: row.id,
    clientUuid: row.clientUuid,
    areaName: row.areaName,
    eventType: row.eventType as 'ENTRY' | 'EXIT',
    createdAt: row.createdAt,
    status: row.status as QueueItemStatus,
    errorMessage: row.errorMessage,
  };
}

export interface EnqueueInput {
  clientUuid: string;
  areaName: string;
  eventType: 'ENTRY' | 'EXIT';
  payload: AccessEventRequest;
}

/** Adds an event to the local queue. Safe to call with an already-queued clientUuid (no-op, keeps idempotency). */
export async function enqueueEvent(input: EnqueueInput): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM queue WHERE clientUuid = ?',
    input.clientUuid,
  );
  if (existing) return;

  const cipher = await encryptPayload(input.payload);
  await db.runAsync(
    `INSERT INTO queue (clientUuid, areaName, eventType, createdAt, status, errorMessage, payloadCipher)
     VALUES (?, ?, ?, ?, 'pending', NULL, ?)`,
    input.clientUuid,
    input.areaName,
    input.eventType,
    new Date().toISOString(),
    cipher,
  );
}

export async function getAllQueueItems(): Promise<QueueItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<QueueRow>('SELECT * FROM queue ORDER BY createdAt DESC');
  return rows.map(rowToItem);
}

export async function getUnsyncedCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM queue WHERE status != 'synced'",
  );
  return row?.count ?? 0;
}

/** Items eligible to be sent: pending or previously errored, but not currently mid-sync (prevents double submission). */
export async function getSyncableItems(): Promise<Array<QueueItem & { payload: AccessEventRequest }>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<QueueRow>(
    "SELECT * FROM queue WHERE status IN ('pending', 'error') ORDER BY createdAt ASC",
  );
  const items = await Promise.all(
    rows.map(async (row) => ({
      ...rowToItem(row),
      payload: await decryptPayload<AccessEventRequest>(row.payloadCipher),
    })),
  );
  return items;
}

export async function markItemsSyncing(clientUuids: string[]): Promise<void> {
  if (clientUuids.length === 0) return;
  const db = await getDatabase();
  const placeholders = clientUuids.map(() => '?').join(',');
  await db.runAsync(`UPDATE queue SET status = 'syncing' WHERE clientUuid IN (${placeholders})`, ...clientUuids);
}

export async function markItemSynced(clientUuid: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE queue SET status = 'synced', errorMessage = NULL WHERE clientUuid = ?", clientUuid);
}

export async function markItemError(clientUuid: string, errorMessage: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE queue SET status = 'error', errorMessage = ? WHERE clientUuid = ?", errorMessage, clientUuid);
}

/** Reverts items stuck in 'syncing' back to 'pending', e.g. after an app crash mid-sync. */
export async function resetStuckSyncingItems(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE queue SET status = 'pending' WHERE status = 'syncing'");
}

export async function clearSyncedItems(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM queue WHERE status = 'synced'");
}
