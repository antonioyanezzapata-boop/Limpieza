import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { generateUuid } from '../utils/uuid';

/**
 * Fully on-device offline authentication.
 *
 * We never rely on the network to validate an offline login: a salted,
 * iteratively-hashed PIN is stored in SecureStore (OS keychain / Keystore)
 * per employee code the first time the user sets a PIN, and every offline
 * login attempt is checked against that local value only.
 *
 * `POST /auth/offline-credentials` is still called once (while online) so the
 * server keeps its own audit copy of an offline-pin hash, but that call is
 * never on the offline-login critical path.
 */

const PIN_ROUNDS = 1000;

function pinRecordKey(employeeCode: string): string {
  return `offline.pin.${employeeCode}`;
}

interface StoredPinRecord {
  salt: string;
  hash: string;
}

async function iterativeHash(pin: string, salt: string): Promise<string> {
  let value = `${salt}:${pin}`;
  for (let i = 0; i < PIN_ROUNDS; i++) {
    // eslint-disable-next-line no-await-in-loop -- intentionally sequential, this is the point of iterative hashing
    value = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  }
  return value;
}

/** Persists a new (or replacement) offline PIN for this employee, hashed on-device. */
export async function storeOfflinePin(employeeCode: string, pin: string): Promise<void> {
  const salt = generateUuid();
  const hash = await iterativeHash(pin, salt);
  const record: StoredPinRecord = { salt, hash };
  await SecureStore.setItemAsync(pinRecordKey(employeeCode), JSON.stringify(record));
}

export async function hasOfflinePinStored(employeeCode: string): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(pinRecordKey(employeeCode));
  return raw !== null;
}

/** Compares the entered PIN against the locally stored hash. No network involved. */
export async function verifyOfflinePin(employeeCode: string, pin: string): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(pinRecordKey(employeeCode));
  if (!raw) return false;
  try {
    const record = JSON.parse(raw) as StoredPinRecord;
    const candidate = await iterativeHash(pin, record.salt);
    return candidate === record.hash;
  } catch {
    return false;
  }
}

export async function clearOfflinePin(employeeCode: string): Promise<void> {
  await SecureStore.deleteItemAsync(pinRecordKey(employeeCode));
}
