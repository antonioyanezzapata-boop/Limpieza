import { apiRequest } from './client'
import type { CorrectSessionRequest } from './types'

/**
 * The backend returns the updated session entity; its exact shape is not
 * part of the documented contract, so callers should re-fetch the row from
 * the cleaning-times report afterwards rather than relying on this payload.
 */
export function correctSession(
  sessionId: string,
  payload: CorrectSessionRequest,
): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/access-events/sessions/${sessionId}`, {
    method: 'PATCH',
    body: payload,
  })
}
