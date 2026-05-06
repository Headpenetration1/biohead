import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportError } from '@/utils/logger';
import {
  type AmbientMix,
  type AmbientSoundscape,
  DEFAULT_AMBIENT_MIX,
  AMBIENT_SOUNDSCAPE_IDS,
} from '@/constants/ambientSounds';
import { getProgramById, type ProgramId } from '@/constants/programs';

const STORAGE_KEY = '@biohead_data';

export type SoundMode = 'off' | 'cues' | 'ambient' | 'mix';

function parseSoundMode(raw: unknown): SoundMode {
  if (raw === 'off' || raw === 'cues' || raw === 'ambient' || raw === 'mix') return raw;
  return 'off';
}

function parseAmbientSoundscape(raw: unknown): AmbientSoundscape {
  if (
    typeof raw === 'string' &&
    (AMBIENT_SOUNDSCAPE_IDS as readonly string[]).includes(raw)
  ) {
    return raw as AmbientSoundscape;
  }
  return 'wind';
}

function parseAmbientMix(raw: unknown, fallbackSoundscape: AmbientSoundscape): AmbientMix {
  const base: AmbientMix = { ...DEFAULT_AMBIENT_MIX };
  if (raw == null || typeof raw !== 'object') {
    base[fallbackSoundscape] = 1;
    return base;
  }
  const cast = raw as Partial<Record<AmbientSoundscape, unknown>>;
  for (const key of AMBIENT_SOUNDSCAPE_IDS) {
    const value = cast[key];
    if (typeof value !== 'number' || Number.isNaN(value)) continue;
    base[key] = Math.max(0, Math.min(1, value));
  }
  const hasAny = AMBIENT_SOUNDSCAPE_IDS.some((id) => base[id] > 0.01);
  if (!hasAny) {
    base[fallbackSoundscape] = 1;
  }
  return base;
}

export interface SessionRecord {
  id: string;
  exerciseId: string;
  duration: number;
  completedAt: string;
  stressBefore?: number;
  effectScore?: number;
  ambientSoundscape?: AmbientSoundscape;
}

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface AmbientMixPreset {
  id: string;
  name: string;
  mix: AmbientMix;
}

export interface ActiveProgramState {
  id: ProgramId;
  currentDay: number;
  completedDays: number;
  lastCompletedDate?: string;
}

export interface WidgetSnapshot {
  recommendedExerciseId?: string;
  lastSessionExerciseId?: string;
  updatedAt?: string;
}

export interface SavedSession {
  id: string;
  name: string;
  exerciseId: string;
  duration: number;
  stressLevel?: number;
}

export interface StressCheckSnapshot {
  level: number;
  updatedAt: string;
}

export interface OnboardingProfile {
  stressLevel: number;
  sleepQuality: number;
  focusNeed: number;
}

export interface HealthSyncStatus {
  lastSyncedAt?: string;
  lastErrorAt?: string;
  lastError?: string;
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

function parseAmbientMixPresets(raw: unknown): AmbientMixPreset[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (entry == null || typeof entry !== 'object') return null;
      const cast = entry as Partial<AmbientMixPreset>;
      if (typeof cast.id !== 'string' || typeof cast.name !== 'string') return null;
      return {
        id: cast.id,
        name: cast.name.trim().slice(0, 40) || 'Miks',
        mix: parseAmbientMix(cast.mix, 'wind'),
      };
    })
    .filter((entry): entry is AmbientMixPreset => entry != null);
}

function parseFavorites(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const favorites: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const value = entry.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    favorites.push(value);
  }
  return favorites;
}

function parseSessions(raw: unknown): SessionRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (entry == null || typeof entry !== 'object') return null;
      const cast = entry as Partial<SessionRecord>;
      if (
        typeof cast.id !== 'string' ||
        typeof cast.exerciseId !== 'string' ||
        typeof cast.completedAt !== 'string' ||
        typeof cast.duration !== 'number' ||
        Number.isNaN(cast.duration)
      ) {
        return null;
      }
      if (Number.isNaN(new Date(cast.completedAt).getTime())) return null;
      const stressBefore = clampStressLevel(cast.stressBefore);
      const effectScore = clampStressLevel(cast.effectScore);
      return {
        id: cast.id,
        exerciseId: cast.exerciseId,
        duration: Math.max(1, Math.min(60 * 60, Math.round(cast.duration))),
        completedAt: cast.completedAt,
        ...(stressBefore != null ? { stressBefore } : {}),
        ...(effectScore != null ? { effectScore } : {}),
        ...(cast.ambientSoundscape != null
          ? { ambientSoundscape: parseAmbientSoundscape(cast.ambientSoundscape) }
          : {}),
      };
    })
    .filter((entry): entry is SessionRecord => entry != null);
}

function parseActiveProgram(raw: unknown): ActiveProgramState | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const cast = raw as Partial<ActiveProgramState>;
  if (typeof cast.id !== 'string' || !getProgramById(cast.id)) return undefined;
  const currentDayRaw = typeof cast.currentDay === 'number' ? Math.floor(cast.currentDay) : 1;
  const completedRaw = typeof cast.completedDays === 'number' ? Math.floor(cast.completedDays) : 0;
  return {
    id: cast.id as ProgramId,
    currentDay: Math.max(1, currentDayRaw),
    completedDays: Math.max(0, completedRaw),
    lastCompletedDate:
      typeof cast.lastCompletedDate === 'string' ? cast.lastCompletedDate : undefined,
  };
}

function parseWidgetSnapshot(raw: unknown): WidgetSnapshot {
  if (raw == null || typeof raw !== 'object') return {};
  const cast = raw as Partial<WidgetSnapshot>;
  return {
    recommendedExerciseId:
      typeof cast.recommendedExerciseId === 'string' ? cast.recommendedExerciseId : undefined,
    lastSessionExerciseId:
      typeof cast.lastSessionExerciseId === 'string' ? cast.lastSessionExerciseId : undefined,
    updatedAt: typeof cast.updatedAt === 'string' ? cast.updatedAt : undefined,
  };
}

function clampStressLevel(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return undefined;
  return Math.max(1, Math.min(5, Math.round(raw)));
}

function parseSavedSessions(raw: unknown): SavedSession[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (entry == null || typeof entry !== 'object') return null;
      const cast = entry as Partial<SavedSession>;
      if (
        typeof cast.id !== 'string' ||
        typeof cast.name !== 'string' ||
        typeof cast.exerciseId !== 'string' ||
        typeof cast.duration !== 'number'
      ) {
        return null;
      }
      const stressLevel = clampStressLevel(cast.stressLevel);
      return {
        id: cast.id,
        name: cast.name.trim().slice(0, 40) || 'Lagret økt',
        exerciseId: cast.exerciseId,
        duration: Math.max(15, Math.min(60 * 30, Math.round(cast.duration))),
        ...(stressLevel != null ? { stressLevel } : {}),
      };
    })
    .filter((entry): entry is SavedSession => entry != null);
}

function parseStressSnapshot(raw: unknown): StressCheckSnapshot | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const cast = raw as Partial<StressCheckSnapshot>;
  const level = clampStressLevel(cast.level);
  if (!level || typeof cast.updatedAt !== 'string') return undefined;
  return { level, updatedAt: cast.updatedAt };
}

function parseOnboardingProfile(raw: unknown): OnboardingProfile | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const cast = raw as Partial<OnboardingProfile>;
  const stressLevel = clampStressLevel(cast.stressLevel);
  const sleepQuality = clampStressLevel(cast.sleepQuality);
  const focusNeed = clampStressLevel(cast.focusNeed);
  if (!stressLevel || !sleepQuality || !focusNeed) return undefined;
  return {
    stressLevel,
    sleepQuality,
    focusNeed,
  };
}

function parseHealthSyncStatus(raw: unknown): HealthSyncStatus {
  if (raw == null || typeof raw !== 'object') return {};
  const cast = raw as Partial<HealthSyncStatus>;
  return {
    lastSyncedAt:
      typeof cast.lastSyncedAt === 'string' ? cast.lastSyncedAt : undefined,
    lastErrorAt:
      typeof cast.lastErrorAt === 'string' ? cast.lastErrorAt : undefined,
    lastError: typeof cast.lastError === 'string' ? cast.lastError.slice(0, 160) : undefined,
  };
}

export interface AppData {
  currentStreak: number;
  lastSessionDate: string;
  longestStreak: number;
  sessions: SessionRecord[];
  favorites: string[];
  hasCompletedOnboarding: boolean;
  userGoal?: 'calm' | 'focus' | 'energy';
  onboardingProfile?: OnboardingProfile;
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  soundMode: SoundMode;
  cueVolume: number;
  /** Background loop when soundMode === 'ambient' or 'mix' */
  ambientSoundscape: AmbientSoundscape;
  /** Multi-track mix volumes (0-1) when soundMode === 'ambient' or 'mix' */
  ambientMix: AmbientMix;
  reminderEnabled: boolean;
  reminderTimes: ReminderTime[];
  reminderAdaptiveEnabled: boolean;
  reminderQuietWeekends: boolean;
  reminderSkipIfDoneToday: boolean;
  exerciseDurationPrefs: Record<string, number>;
  ambientMixPresets: AmbientMixPreset[];
  activeProgram?: ActiveProgramState;
  widgetSnapshot: WidgetSnapshot;
  savedSessions: SavedSession[];
  stressCheck?: StressCheckSnapshot;
  weeklyGoalMinutes: number;
  weeklySessionGoal: number;
  toneEnabled: boolean;
  toneFrequency: number;
  toneVolume: number;
  /** iOS: log Mindful Session to Apple Health when a session completes */
  healthSyncEnabled: boolean;
  healthSyncStatus: HealthSyncStatus;
}

export const defaultAppData: AppData = {
  currentStreak: 0,
  lastSessionDate: '',
  longestStreak: 0,
  sessions: [],
  favorites: [],
  hasCompletedOnboarding: false,
  onboardingProfile: undefined,
  hapticsEnabled: true,
  reduceMotion: false,
  soundMode: 'ambient',
  cueVolume: 0.55,
  ambientSoundscape: 'wind',
  ambientMix: { ...DEFAULT_AMBIENT_MIX },
  reminderEnabled: false,
  reminderTimes: [{ hour: 9, minute: 0 }],
  reminderAdaptiveEnabled: false,
  reminderQuietWeekends: false,
  reminderSkipIfDoneToday: true,
  exerciseDurationPrefs: {},
  ambientMixPresets: [],
  activeProgram: undefined,
  widgetSnapshot: {},
  savedSessions: [],
  stressCheck: undefined,
  weeklyGoalMinutes: 40,
  weeklySessionGoal: 5,
  toneEnabled: false,
  toneFrequency: 157,
  toneVolume: 0.5,
  healthSyncEnabled: false,
  healthSyncStatus: {},
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
        soundMode: parseSoundMode(parsed.soundMode),
        cueVolume:
          typeof parsed.cueVolume === 'number' && !Number.isNaN(parsed.cueVolume)
            ? Math.max(0, Math.min(1, parsed.cueVolume))
            : defaultAppData.cueVolume,
        ambientSoundscape: parseAmbientSoundscape(parsed.ambientSoundscape),
        ambientMix: parseAmbientMix(
          parsed.ambientMix,
          parseAmbientSoundscape(parsed.ambientSoundscape)
        ),
        reminderTimes: parseReminderTimes(parsed.reminderTimes, legacyReminderHour, legacyReminderMinute),
        reminderAdaptiveEnabled:
          typeof parsed.reminderAdaptiveEnabled === 'boolean'
            ? parsed.reminderAdaptiveEnabled
            : defaultAppData.reminderAdaptiveEnabled,
        favorites: parseFavorites(parsed.favorites),
        sessions: parseSessions(parsed.sessions),
        onboardingProfile: parseOnboardingProfile(
          (parsed as { onboardingProfile?: unknown }).onboardingProfile
        ),
        ambientMixPresets: parseAmbientMixPresets(parsed.ambientMixPresets),
        activeProgram: parseActiveProgram(parsed.activeProgram),
        widgetSnapshot: parseWidgetSnapshot(parsed.widgetSnapshot),
        savedSessions: parseSavedSessions((parsed as { savedSessions?: unknown }).savedSessions),
        stressCheck: parseStressSnapshot((parsed as { stressCheck?: unknown }).stressCheck),
        exerciseDurationPrefs: {
          ...defaultAppData.exerciseDurationPrefs,
          ...(parsed.exerciseDurationPrefs ?? {}),
        },
        weeklyGoalMinutes:
          typeof parsed.weeklyGoalMinutes === 'number' && parsed.weeklyGoalMinutes > 0
            ? Math.round(parsed.weeklyGoalMinutes)
            : defaultAppData.weeklyGoalMinutes,
        weeklySessionGoal:
          typeof parsed.weeklySessionGoal === 'number' && parsed.weeklySessionGoal > 0
            ? Math.round(parsed.weeklySessionGoal)
            : defaultAppData.weeklySessionGoal,
        toneEnabled:
          typeof parsed.toneEnabled === 'boolean'
            ? parsed.toneEnabled
            : defaultAppData.toneEnabled,
        toneFrequency:
          typeof parsed.toneFrequency === 'number' && !Number.isNaN(parsed.toneFrequency)
            ? Math.max(40, Math.min(1000, Math.round(parsed.toneFrequency)))
            : defaultAppData.toneFrequency,
        toneVolume:
          typeof parsed.toneVolume === 'number' && !Number.isNaN(parsed.toneVolume)
            ? Math.max(0, Math.min(1, parsed.toneVolume))
            : defaultAppData.toneVolume,
        healthSyncStatus: parseHealthSyncStatus(
          (parsed as { healthSyncStatus?: unknown }).healthSyncStatus
        ),
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
    reportError('Failed to save app data', e);
  }
}

export async function clearAppData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    reportError('Failed to clear app data', e);
  }
}
