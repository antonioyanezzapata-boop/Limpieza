import { AES, Utf8 } from 'crypto-es';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Encryption for the local offline queue ("guardar el movimiento localmente
 * de forma cifrada"). We use AES (crypto-es, a pure-JS, actively maintained
 * fork of crypto-js) so it works in the Expo managed workflow without any
 * native module linking.
 *
 * A random 256-bit key is generated on first use (via expo-crypto's CSPRNG)
 * and stored in SecureStore, which is backed by the iOS Keychain / Android
 * Keystore. It never leaves the device and is never sent to the server.
 */

const QUEUE_KEY_STORAGE_KEY = 'queue.encryptionKey';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getOrCreateEncryptionKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(QUEUE_KEY_STORAGE_KEY);
  if (existing) return existing;
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const key = bytesToHex(randomBytes);
  await SecureStore.setItemAsync(QUEUE_KEY_STORAGE_KEY, key);
  return key;
}

export async function encryptPayload(payload: unknown): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  return AES.encrypt(JSON.stringify(payload), key).toString();
}

export async function decryptPayload<T>(cipherText: string): Promise<T> {
  const key = await getOrCreateEncryptionKey();
  const decrypted = AES.decrypt(cipherText, key);
  const json = decrypted.toString(Utf8);
  return JSON.parse(json) as T;
}
