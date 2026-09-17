import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { generateUuid } from './uuid';
import type { DevicePlatform } from '../api/types';

const DEVICE_ID_KEY = 'device.id';

/**
 * Returns a stable per-install device identifier, generating and persisting
 * one the first time it's needed. Used as `deviceId` on login/access-events.
 */
export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generateUuid();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}

export function getDevicePlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}
