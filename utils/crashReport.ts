import AsyncStorage from '@react-native-async-storage/async-storage';

const CRASH_KEY = '@biohead_last_crash';

export interface CrashReport {
  message: string;
  stack?: string;
  componentStack?: string;
  savedAt: string;
}

export async function saveCrashReport(error: Error, componentStack?: string): Promise<void> {
  try {
    const report: CrashReport = {
      message: error.message,
      stack: error.stack,
      componentStack,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CRASH_KEY, JSON.stringify(report));
  } catch {
    /* ignore */
  }
}

export async function loadCrashReport(): Promise<CrashReport | null> {
  try {
    const raw = await AsyncStorage.getItem(CRASH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CrashReport;
  } catch {
    return null;
  }
}
