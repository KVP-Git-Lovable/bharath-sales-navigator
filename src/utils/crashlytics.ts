import { Capacitor } from '@capacitor/core';

let crashlyticsInstance: any = null;

export async function initCrashlytics(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('⚠️ Crashlytics: Skipping on web platform');
    return;
  }

  try {
    const { FirebaseCrashlytics } = await import('@capacitor-community/firebase-crashlytics');
    crashlyticsInstance = FirebaseCrashlytics;
    await FirebaseCrashlytics.setEnabled({ enabled: true });
    console.log('✅ Firebase Crashlytics initialized');
  } catch (error) {
    console.warn('⚠️ Firebase Crashlytics init failed:', error);
  }
}

export async function logCrashlytics(message: string): Promise<void> {
  if (!crashlyticsInstance) return;
  try {
    await crashlyticsInstance.log({ message });
  } catch (e) {
    console.warn('Crashlytics log failed:', e);
  }
}

export async function setCrashlyticsUser(userId: string): Promise<void> {
  if (!crashlyticsInstance) return;
  try {
    await crashlyticsInstance.setUserId({ userId });
  } catch (e) {
    console.warn('Crashlytics setUserId failed:', e);
  }
}

export async function recordCrashlyticsError(message: string, domain?: string, code?: number): Promise<void> {
  if (!crashlyticsInstance) return;
  try {
    await crashlyticsInstance.recordException({
      message,
      domain: domain || 'app',
      code: code || 0,
    });
  } catch (e) {
    console.warn('Crashlytics recordException failed:', e);
  }
}

export async function testCrash(): Promise<void> {
  if (!crashlyticsInstance) {
    console.warn('Crashlytics not available — cannot test crash');
    return;
  }
  await crashlyticsInstance.crash({ message: 'Test crash from app' });
}
