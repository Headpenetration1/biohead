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

/**
 * Writes one Mindful Session sample for a completed breathing session (iOS + dev/production build with native module).
 */
export async function logMindfulSessionIfEnabled(
  enabled: boolean,
  durationSeconds: number
): Promise<void> {
  if (!enabled || durationSeconds <= 0) return;

  const HK = getHealthModule();
  const perms = mindfulPermissions();
  if (!HK || !perms) return;

  await new Promise<void>((resolve) => {
    HK.initHealthKit(perms, (error: string) => {
      if (error) {
        resolve();
        return;
      }
      const end = new Date();
      const start = new Date(end.getTime() - durationSeconds * 1000);
      HK.saveMindfulSession(
        {
          value: 0,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        () => resolve()
      );
    });
  });
}
