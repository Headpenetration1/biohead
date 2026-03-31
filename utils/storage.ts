import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@biohead_data';

export type SoundMode = 'off' | 'cues' | 'ambient';

export interface SessionRecord {
  id: string;
  exerciseId: string;
  duration: number;
  completedAt: string;
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
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  exerciseDurationPrefs: Record<string, number>;
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
  reminderEnabled: false,
  reminderHour: 9,
  reminderMinute: 0,
  exerciseDurationPrefs: {},
  healthSyncEnabled: false,
};

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      return {
        ...defaultAppData,
        ...parsed,
        favorites: parsed.favorites ?? defaultAppData.favorites,
        sessions: parsed.sessions ?? defaultAppData.sessions,
        exerciseDurationPrefs: {
          ...defaultAppData.exerciseDurationPrefs,
          ...(parsed.exerciseDurationPrefs ?? {}),
        },
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
