import { Platform, NativeModules } from 'react-native';
import type { HealthKitPermissions } from 'react-native-health';

type AppleHealthKitModule = typeof import('react-native-health').default;

let healthModule: AppleHealthKitModule | null | undefined;

function getHealthModule(): AppleHealthKitModule | null {
  if (Platform.OS !== 'ios') return null;
  if (healthModule === undefined) {
    try {
      if (!NativeModules.AppleHealthKit) {
        healthModule = null;
        return null;
      }
      // Metro resolves native module only on iOS dev/production builds.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      healthModule = require('react-native-health').default as AppleHealthKitModule;
    } catch {
      healthModule = null;
    }
  }
  return healthModule;
}

function mindfulPermissions(): HealthKitPermissions | null {
  const HK = getHealthModule();
  if (!HK) return null;
  return {
    permissions: {
      read: [],
      write: [HK.Constants.Permissions.MindfulSession],
    },
  };
}

/**
 * Returns true if Health is available and write permission for Mindful Session was granted.
 */
export async function requestHealthKitMindfulAccess(): Promise<boolean> {
  const HK = getHealthModule();
  const perms = mindfulPermissions();
  if (!HK || !perms) return false;

  return new Promise((resolve) => {
    HK.isAvailable((err: unknown, available: boolean) => {
      if (err || !available) {
        resolve(false);
        return;
      }
      HK.initHealthKit(perms, (error: string) => {
        resolve(!error);
      });
    });
  });
}

// Safety net: if the native HealthKit callback never fires (which we have seen
// happen in the wild when the module is in a weird state), we still want our
// awaiter to release so we never block the session completion flow.
const HEALTH_CALLBACK_TIMEOUT_MS = 5000;

export type MindfulSessionLogResult =
  | { status: 'skipped' }
  | { status: 'synced'; syncedAt: string }
  | { status: 'failed'; error: string; failedAt: string };

function withTimeout<T>(factory: (resolve: (value: T) => void) => void, timeoutValue: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const settle = (value: T) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => settle(timeoutValue), HEALTH_CALLBACK_TIMEOUT_MS);
    factory((value) => {
      clearTimeout(timer);
      settle(value);
    });
  });
}

/**
 * Writes one Mindful Session sample for a completed breathing session (iOS + dev/production build with native module).
 * Failures are swallowed so that losing Apple Health never blocks the rest of the completion flow.
 */
export async function logMindfulSessionIfEnabled(
  enabled: boolean,
  durationSeconds: number
): Promise<MindfulSessionLogResult> {
  if (!enabled || durationSeconds <= 0) return { status: 'skipped' };

  const HK = getHealthModule();
  const perms = mindfulPermissions();
  if (!HK || !perms) {
    return {
      status: 'failed',
      error: 'Apple Helse er ikke tilgjengelig i denne builden.',
      failedAt: new Date().toISOString(),
    };
  }

  const initError = await withTimeout<string | null>((resolve) => {
    HK.initHealthKit(perms, (error: string) => resolve(error || null));
  }, 'timeout');

  if (initError) {
    return {
      status: 'failed',
      error: initError === 'timeout' ? 'Apple Helse svarte ikke i tide.' : initError,
      failedAt: new Date().toISOString(),
    };
  }

  const end = new Date();
  const start = new Date(end.getTime() - durationSeconds * 1000);

  const saveError = await withTimeout<string | null>((resolve) => {
    HK.saveMindfulSession(
      {
        value: 0,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      (error: string) => resolve(error || null)
    );
  }, 'timeout');

  if (saveError) {
    return {
      status: 'failed',
      error: saveError === 'timeout' ? 'Apple Helse svarte ikke i tide.' : saveError,
      failedAt: new Date().toISOString(),
    };
  }

  return { status: 'synced', syncedAt: end.toISOString() };
}
