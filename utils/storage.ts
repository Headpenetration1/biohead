import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type AmbientSoundscape,
  AMBIENT_SOUNDSCAPE_IDS,
} from '@/constants/ambientSounds';

const STORAGE_KEY = '@biohead_data';

export type SoundMode = 'off' | 'cues' | 'ambient';

function parseAmbientSoundscape(raw: unknown): AmbientSoundscape {
  if (
    typeof raw === 'string' &&
    (AMBIENT_SOUNDSCAPE_IDS as readonly string[]).includes(raw)
  ) {
    return raw as AmbientSoundscape;
  }
  return 'wind';
}

export interface SessionRecord {
  id: string;
  exerciseId: string;
  duration: number;
  completedAt: string;
}

export interface ReminderTime {
  hour: number;
  minute: number;
}

function clampHour(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(23, Math.round(value)));
}

function clampMinute(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(59, Math.round(value)));
}

function parseReminderTimes(
  raw: unknown,
  fallbackHour: number,
  fallbackMinute: number
): ReminderTime[] {
  if (!Array.isArray(raw)) {
    return [{ hour: fallbackHour, minute: fallbackMinute }];
  }
  const parsed = raw
    .map((entry) => {
      if (entry == null || typeof entry !== 'object') return null;
      const cast = entry as Partial<ReminderTime>;
      return {
        hour: clampHour(cast.hour, fallbackHour),
        minute: clampMinute(cast.minute, fallbackMinute),
      };
    })
    .filter((item): item is ReminderTime => item != null);

  const unique = parsed.filter(
    (time, idx, arr) =>
      arr.findIndex((candidate) => candidate.hour === time.hour && candidate.minute === time.minute) ===
      idx
  );
  return unique.length > 0 ? unique : [{ hour: fallbackHour, minute: fallbackMinute }];
}

export interface AppData {
  currentStreak: number;
  lastSessionDate: string;
  longestStreak: number;
  sessions: SessionRecord[];
  favorites: string[];
  hasCompletedOnboarding: boolean;
  userGoal?: 'calm' | 'focus' | 'energy';
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  soundMode: SoundMode;
  /** Background loop when soundMode === 'ambient' */
  ambientSoundscape: AmbientSoundscape;
  reminderEnabled: boolean;
  reminderTimes: ReminderTime[];
  reminderQuietWeekends: boolean;
  reminderSkipIfDoneToday: boolean;
  exerciseDurationPrefs: Record<string, number>;
  weeklyGoalMinutes: number;
  /** iOS: log Mindful Session to Apple Health when a session completes */
  healthSyncEnabled: boolean;
}

export const defaultAppData: AppData = {
  currentStreak: 0,
  lastSessionDate: '',
  longestStreak: 0,
  sessions: [],
  favorites: [],
  hasCompletedOnboarding: false,
  hapticsEnabled: true,
  reduceMotion: false,
  soundMode: 'off',
  ambientSoundscape: 'wind',
  reminderEnabled: false,
  reminderTimes: [{ hour: 9, minute: 0 }],
  reminderQuietWeekends: false,
  reminderSkipIfDoneToday: true,
  exerciseDurationPrefs: {},
  weeklyGoalMinutes: 40,
  healthSyncEnabled: false,
};

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      const legacyReminderHour = clampHour((parsed as { reminderHour?: unknown }).reminderHour, 9);
      const legacyReminderMinute = clampMinute((parsed as { reminderMinute?: unknown }).reminderMinute, 0);
      return {
        ...defaultAppData,
        ...parsed,
        ambientSoundscape: parseAmbientSoundscape(parsed.ambientSoundscape),
        reminderTimes: parseReminderTimes(parsed.reminderTimes, legacyReminderHour, legacyReminderMinute),
        favorites: parsed.favorites ?? defaultAppData.favorites,
        sessions: parsed.sessions ?? defaultAppData.sessions,
        exerciseDurationPrefs: {
          ...defaultAppData.exerciseDurationPrefs,
          ...(parsed.exerciseDurationPrefs ?? {}),
        },
        weeklyGoalMinutes:
          typeof parsed.weeklyGoalMinutes === 'number' && parsed.weeklyGoalMinutes > 0
            ? Math.round(parsed.weeklyGoalMinutes)
            : defaultAppData.weeklyGoalMinutes,
      };
    }
    return defaultAppData;
  } catch {
    return defaultAppData;
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save app data:', e);
  }
}

export async function clearAppData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear app data:', e);
  }
}
