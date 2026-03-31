import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@biohead_data';

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
}

const defaultData: AppData = {
  currentStreak: 0,
  lastSessionDate: '',
  longestStreak: 0,
  sessions: [],
  favorites: [],
  hasCompletedOnboarding: false,
};

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultData, ...JSON.parse(raw) };
    }
    return defaultData;
  } catch {
    return defaultData;
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
