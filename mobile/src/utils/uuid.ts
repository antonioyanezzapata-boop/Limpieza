import * as Crypto from 'expo-crypto';

/** Generates a random v4-style UUID for idempotency keys (clientUuid) and similar uses. */
export function generateUuid(): string {
  return Crypto.randomUUID();
}
