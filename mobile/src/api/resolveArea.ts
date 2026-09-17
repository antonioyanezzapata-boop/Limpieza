import { cacheResolvedArea, getCachedArea } from '../db/areaCache';
import { ApiError } from './client';
import { resolveQr } from './endpoints';
import type { Area } from './types';

export interface ResolvedArea {
  qrId: string;
  area: Area;
  /** True when this came from the on-device cache rather than a live server call. */
  fromCache: boolean;
}

/**
 * Resolves a scanned QR token to its area, preferring the live backend call but
 * falling back to the on-device cache (populated by a previous successful
 * resolve) when there's no connectivity. There is no way to resolve a QR the
 * device has never seen before while offline — the backend is the source of
 * truth for which areas/QRs exist.
 */
export async function resolveAreaForToken(qrToken: string, isConnected: boolean): Promise<ResolvedArea> {
  if (isConnected) {
    try {
      const res = await resolveQr({ token: qrToken });
      await cacheResolvedArea(qrToken, res.qrId, res.area);
      return { qrId: res.qrId, area: res.area, fromCache: false };
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        const cached = await getCachedArea(qrToken);
        if (cached) return { ...cached, fromCache: true };
      }
      throw err;
    }
  }

  const cached = await getCachedArea(qrToken);
  if (cached) return { ...cached, fromCache: true };
  throw new ApiError(
    'Esta área no se ha escaneado antes en este dispositivo. Se necesita conexión para identificarla la primera vez.',
    { isNetworkError: true },
  );
}
