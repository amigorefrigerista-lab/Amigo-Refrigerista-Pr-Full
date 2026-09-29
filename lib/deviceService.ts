import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export interface DeviceInfo {
  deviceId: string;
  userAgent: string;
  platform: string;
  lastLogin: string;
}

export function getUniqueDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('amigo_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('amigo_device_id', deviceId);
  }
  return deviceId;
}

export async function recordDeviceLogin(userId: string): Promise<DeviceInfo> {
  const deviceId = getUniqueDeviceId();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || 'web') : 'web';
  const now = new Date().toISOString();

  const info: DeviceInfo = {
    deviceId,
    userAgent,
    platform,
    lastLogin: now,
  };

  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      lastActiveDevice: deviceId,
      lastLoginAt: now,
      deviceInfo: info,
    }, { merge: true });
  } catch (err) {
    console.warn('Could not record device login:', err);
  }

  return info;
}
