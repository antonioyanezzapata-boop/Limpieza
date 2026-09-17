import type { Area } from '../api/types';
import { getDatabase } from './db';

/**
 * Local cache of qrToken -> resolved area, populated every time
 * POST /qr-codes/resolve succeeds. Lets a previously-scanned QR still show its
 * area name/floor when the device is offline (resolving is a network call and
 * has no offline equivalent on the backend).
 */

interface AreaCacheRow {
  qrToken: string;
  qrId: string;
  areaJson: string;
}

export async function cacheResolvedArea(qrToken: string, qrId: string, area: Area): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO area_cache (qrToken, qrId, areaJson, updatedAt) VALUES (?, ?, ?, ?)
     ON CONFLICT(qrToken) DO UPDATE SET qrId = excluded.qrId, areaJson = excluded.areaJson, updatedAt = excluded.updatedAt`,
    qrToken,
    qrId,
    JSON.stringify(area),
    new Date().toISOString(),
  );
}

export async function getCachedArea(qrToken: string): Promise<{ qrId: string; area: Area } | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AreaCacheRow>('SELECT * FROM area_cache WHERE qrToken = ?', qrToken);
  if (!row) return null;
  try {
    return { qrId: row.qrId, area: JSON.parse(row.areaJson) as Area };
  } catch {
    return null;
  }
}

/**
 * Reverse lookup used by the "REGISTRAR SALIDA" shortcut on the Actividad
 * Actual screen: given an open session's area id, find a previously-scanned
 * QR token for that same area so the exit can be confirmed without going
 * through the camera again.
 */
export async function findCachedTokenForAreaId(areaId: string): Promise<{ qrToken: string; area: Area } | null> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AreaCacheRow>('SELECT * FROM area_cache');
  for (const row of rows) {
    try {
      const area = JSON.parse(row.areaJson) as Area;
      if (area.id === areaId) return { qrToken: row.qrToken, area };
    } catch {
      // Skip malformed rows.
    }
  }
  return null;
}
