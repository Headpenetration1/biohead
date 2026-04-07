import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  AMBIENT_SOUNDSCAPE_IDS,
  type AmbientSoundscape,
  type AmbientMix,
} from '@/constants/ambientSounds';
import { getProgramById, type ProgramId } from '@/constants/programs';
import {
  type AmbientMixPreset,
  AppData,
  type OnboardingProfile,
  ReminderTime,
  type SavedSession,
  SessionRecord,
  type StressCheckSnapshot,
  type WidgetSnapshot,
  defaultAppData,
  loadAppData,
  saveAppData,
  SoundMode,
} from '@/utils/storage';
import { getToday, getYesterday } from '@/utils/formatTime';
import { nextStreakOnSessionComplete } from '@/utils/streak';
import { syncDailyReminder } from '@/utils/reminders';
import { syncWidgetSnapshot } from '@/utils/widgetBridge';

interface AppState extends AppData {
  isLoading: boolean;
}

const baseInitial: AppState = {
  ...defaultAppData,
  isLoading: true,
};

type Action =
  | { type: 'LOAD_DATA'; payload: AppData }
  | {
      type: 'COMPLETE_SESSION';
      payload: { exerciseId: string; duration: number; stressBefore?: number };
    }
  | { type: 'RATE_LAST_SESSION'; payload: number }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | {
      type: 'COMPLETE_ONBOARDING';
      payload?: {
        goal?: 'calm' | 'focus' | 'energy';
        profile?: OnboardingProfile;
        starterProgramId?: ProgramId;
      };
    }
  | { type: 'START_PROGRAM'; payload: ProgramId }
  | { type: 'SAVE_AMBIENT_PRESET'; payload?: { name?: string } }
  | { type: 'APPLY_AMBIENT_PRESET'; payload: string }
  | { type: 'DELETE_AMBIENT_PRESET'; payload: string }
  | { type: 'SET_WIDGET_SNAPSHOT'; payload: Partial<WidgetSnapshot> }
  | {
      type: 'SAVE_SESSION_SETUP';
      payload: { exerciseId: string; duration: number; stressLevel?: number; name?: string };
    }
  | { type: 'DELETE_SESSION_SETUP'; payload: string }
  | { type: 'SET_STRESS_CHECK'; payload?: StressCheckSnapshot }
  | {
      type: 'UPDATE_PREFERENCES';
      payload: Partial<{
        hapticsEnabled: boolean;
        reduceMotion: boolean;
        soundMode: SoundMode;
        cueVolume: number;
        ambientSoundscape: AmbientSoundscape;
        ambientMix: AmbientMix;
        ambientMixPresets: AmbientMixPreset[];
        reminderEnabled: boolean;
        reminderTimes: ReminderTime[];
        reminderAdaptiveEnabled: boolean;
        reminderQuietWeekends: boolean;
        reminderSkipIfDoneToday: boolean;
        weeklyGoalMinutes: number;
        weeklySessionGoal: number;
        healthSyncEnabled: boolean;
      }>;
    }
  | { type: 'SET_EXERCISE_DURATION'; payload: { exerciseId: string; duration: number } }
  | { type: 'RESET_DATA' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false };

    case 'COMPLETE_SESSION': {
      const today = getToday();
      const yesterday = getYesterday();

      const newStreak = nextStreakOnSessionComplete(
        state.lastSessionDate,
        state.currentStreak,
        today,
        yesterday
      );

      const newSession: SessionRecord = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        exerciseId: action.payload.exerciseId,
        duration: action.payload.duration,
        completedAt: new Date().toISOString(),
        stressBefore: action.payload.stressBefore,
        ambientSoundscape:
          state.soundMode === 'ambient' || state.soundMode === 'mix'
            ? state.ambientSoundscape
            : undefined,
      };

      return {
        ...state,
        currentStreak: newStreak,
        lastSessionDate: today,
        longestStreak: Math.max(state.longestStreak, newStreak),
        sessions: [...state.sessions, newSession],
        activeProgram: (() => {
          if (!state.activeProgram) return state.activeProgram;
          const program = getProgramById(state.activeProgram.id);
          if (!program) return undefined;
          const step = program.days[state.activeProgram.currentDay - 1];
          const alreadyCompletedToday = state.activeProgram.lastCompletedDate === today;
          const matchesProgramStep = step?.exerciseId === action.payload.exerciseId;
          if (!step || alreadyCompletedToday || !matchesProgramStep) return state.activeProgram;
          const completedDays = Math.min(program.days.length, state.activeProgram.completedDays + 1);
          if (completedDays >= program.days.length) return undefined;
          return {
            ...state.activeProgram,
            completedDays,
            currentDay: completedDays + 1,
            lastCompletedDate: today,
          };
        })(),
        widgetSnapshot: {
          ...state.widgetSnapshot,
          lastSessionExerciseId: action.payload.exerciseId,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    case 'RATE_LAST_SESSION': {
      if (state.sessions.length === 0) return state;
      const score = Math.max(1, Math.min(5, Math.round(action.payload)));
      const nextSessions = [...state.sessions];
      const lastIndex = nextSessions.length - 1;
      // Effect-score is always attached to the most recently completed session.
      nextSessions[lastIndex] = { ...nextSessions[lastIndex], effectScore: score };
      return {
        ...state,
        sessions: nextSessions,
      };
    }

    case 'TOGGLE_FAVORITE': {
      const id = action.payload;
      const exists = state.favorites.includes(id);
      return {
        ...state,
        favorites: exists
          ? state.favorites.filter((f) => f !== id)
          : [...state.favorites, id],
      };
    }

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        hasCompletedOnboarding: true,
        userGoal: action.payload?.goal,
        onboardingProfile: action.payload?.profile,
        activeProgram:
          action.payload?.starterProgramId && !state.activeProgram
            ? {
                id: action.payload.starterProgramId,
                currentDay: 1,
                completedDays: 0,
                lastCompletedDate: undefined,
              }
            : state.activeProgram,
      };

    case 'START_PROGRAM':
      return {
        ...state,
        activeProgram: {
          id: action.payload,
          currentDay: 1,
          completedDays: 0,
          lastCompletedDate: undefined,
        },
      };

    case 'SAVE_AMBIENT_PRESET': {
      const nextId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const fallbackName = `Miks ${state.ambientMixPresets.length + 1}`;
      const name = action.payload?.name?.trim() || fallbackName;
      const newPreset: AmbientMixPreset = { id: nextId, name: name.slice(0, 40), mix: state.ambientMix };
      return {
        ...state,
        ambientMixPresets: [newPreset, ...state.ambientMixPresets].slice(0, 8),
      };
    }

    case 'APPLY_AMBIENT_PRESET': {
      const preset = state.ambientMixPresets.find((item) => item.id === action.payload);
      if (!preset) return state;
      const dominant = AMBIENT_SOUNDSCAPE_IDS.reduce<AmbientSoundscape>(
        (best, id) => ((preset.mix[id] ?? 0) > (preset.mix[best] ?? 0) ? id : best),
        'wind'
      );
      return {
        ...state,
        ambientMix: preset.mix,
        ambientSoundscape: dominant,
      };
    }

    case 'DELETE_AMBIENT_PRESET':
      return {
        ...state,
        ambientMixPresets: state.ambientMixPresets.filter((item) => item.id !== action.payload),
      };

    case 'SET_WIDGET_SNAPSHOT':
      return {
        ...state,
        widgetSnapshot: {
          ...state.widgetSnapshot,
          ...action.payload,
          updatedAt: new Date().toISOString(),
        },
      };

    case 'SAVE_SESSION_SETUP': {
      const nextId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const ex = action.payload.exerciseId;
      const fallbackName = `Økt ${state.savedSessions.length + 1}`;
      const nextSetup: SavedSession = {
        id: nextId,
        name: action.payload.name?.trim().slice(0, 40) || fallbackName,
        exerciseId: ex,
        duration: Math.max(15, Math.round(action.payload.duration)),
        stressLevel: action.payload.stressLevel,
      };
      return {
        ...state,
        // Keep list short so Settings/Home stay fast and readable.
        savedSessions: [nextSetup, ...state.savedSessions].slice(0, 12),
      };
    }

    case 'DELETE_SESSION_SETUP':
      return {
        ...state,
        savedSessions: state.savedSessions.filter((entry) => entry.id !== action.payload),
      };

    case 'SET_STRESS_CHECK':
      return {
        ...state,
        stressCheck: action.payload,
      };

    case 'UPDATE_PREFERENCES':
      return { ...state, ...action.payload };

    case 'SET_EXERCISE_DURATION':
      return {
        ...state,
        exerciseDurationPrefs: {
          ...state.exerciseDurationPrefs,
          [action.payload.exerciseId]: action.payload.duration,
        },
      };

    case 'RESET_DATA':
      return { ...baseInitial, isLoading: false };

    default:
      return state;
  }
}

export type PreferenceUpdates = Partial<{
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  soundMode: SoundMode;
  cueVolume: number;
  ambientSoundscape: AmbientSoundscape;
  ambientMix: AmbientMix;
  ambientMixPresets: AmbientMixPreset[];
  reminderEnabled: boolean;
  reminderTimes: ReminderTime[];
  reminderAdaptiveEnabled: boolean;
  reminderQuietWeekends: boolean;
  reminderSkipIfDoneToday: boolean;
  weeklyGoalMinutes: number;
  weeklySessionGoal: number;
  healthSyncEnabled: boolean;
}>;

interface AppContextValue {
  state: AppState;
  completeSession: (exerciseId: string, duration: number, stressBefore?: number) => void;
  rateLastSession: (effectScore: number) => void;
  toggleFavorite: (exerciseId: string) => void;
  completeOnboarding: (payload?: {
    goal?: 'calm' | 'focus' | 'energy';
    profile?: OnboardingProfile;
    starterProgramId?: ProgramId;
  }) => void;
  startProgram: (programId: ProgramId) => void;
  saveAmbientPreset: (name?: string) => void;
  applyAmbientPreset: (presetId: string) => void;
  deleteAmbientPreset: (presetId: string) => void;
  setWidgetSnapshot: (snapshot: Partial<WidgetSnapshot>) => void;
  saveSessionSetup: (payload: {
    exerciseId: string;
    duration: number;
    stressLevel?: number;
    name?: string;
  }) => void;
  deleteSessionSetup: (sessionId: string) => void;
  setStressCheck: (level: number) => void;
  updatePreferences: (prefs: PreferenceUpdates) => void;
  setExerciseDuration: (exerciseId: string, duration: number) => void;
  resetData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, baseInitial);

  useEffect(() => {
    loadAppData().then((data) => {
      dispatch({ type: 'LOAD_DATA', payload: data });
    });
  }, []);

  useEffect(() => {
    if (!state.isLoading) {
      const { isLoading, ...data } = state;
      saveAppData(data);
    }
  }, [state]);

  useEffect(() => {
    if (state.isLoading) return;
    void syncDailyReminder(state.reminderEnabled, state.reminderTimes, {
      adaptiveEnabled: state.reminderAdaptiveEnabled,
      sessions: state.sessions,
      quietWeekends: state.reminderQuietWeekends,
      skipIfDoneToday: state.reminderSkipIfDoneToday,
      lastSessionDate: state.lastSessionDate,
    });
  }, [
    state.isLoading,
    state.reminderEnabled,
    state.reminderTimes,
    state.reminderAdaptiveEnabled,
    state.sessions,
    state.reminderQuietWeekends,
    state.reminderSkipIfDoneToday,
    state.lastSessionDate,
  ]);

  useEffect(() => {
    if (state.isLoading) return;
    syncWidgetSnapshot(state.widgetSnapshot);
  }, [state.isLoading, state.widgetSnapshot]);

  const completeSession = useCallback((exerciseId: string, duration: number, stressBefore?: number) => {
    dispatch({ type: 'COMPLETE_SESSION', payload: { exerciseId, duration, stressBefore } });
  }, []);

  const rateLastSession = useCallback((effectScore: number) => {
    dispatch({ type: 'RATE_LAST_SESSION', payload: effectScore });
  }, []);

  const toggleFavorite = useCallback((exerciseId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', payload: exerciseId });
  }, []);

  const completeOnboarding = useCallback(
    (payload?: {
      goal?: 'calm' | 'focus' | 'energy';
      profile?: OnboardingProfile;
      starterProgramId?: ProgramId;
    }) => {
      dispatch({ type: 'COMPLETE_ONBOARDING', payload });
    },
    []
  );

  const startProgram = useCallback((programId: ProgramId) => {
    dispatch({ type: 'START_PROGRAM', payload: programId });
  }, []);

  const saveAmbientPreset = useCallback((name?: string) => {
    dispatch({ type: 'SAVE_AMBIENT_PRESET', payload: { name } });
  }, []);

  const applyAmbientPreset = useCallback((presetId: string) => {
    dispatch({ type: 'APPLY_AMBIENT_PRESET', payload: presetId });
  }, []);

  const deleteAmbientPreset = useCallback((presetId: string) => {
    dispatch({ type: 'DELETE_AMBIENT_PRESET', payload: presetId });
  }, []);

  const setWidgetSnapshot = useCallback((snapshot: Partial<WidgetSnapshot>) => {
    dispatch({ type: 'SET_WIDGET_SNAPSHOT', payload: snapshot });
  }, []);

  const saveSessionSetup = useCallback(
    (payload: { exerciseId: string; duration: number; stressLevel?: number; name?: string }) => {
      dispatch({ type: 'SAVE_SESSION_SETUP', payload });
    },
    []
  );

  const deleteSessionSetup = useCallback((sessionId: string) => {
    dispatch({ type: 'DELETE_SESSION_SETUP', payload: sessionId });
  }, []);

  const setStressCheck = useCallback((level: number) => {
    const safeLevel = Math.max(1, Math.min(5, Math.round(level)));
    dispatch({
      type: 'SET_STRESS_CHECK',
      payload: {
        level: safeLevel,
        updatedAt: new Date().toISOString(),
      },
    });
  }, []);

  const updatePreferences = useCallback((prefs: PreferenceUpdates) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: prefs });
  }, []);

  const setExerciseDuration = useCallback((exerciseId: string, duration: number) => {
    dispatch({ type: 'SET_EXERCISE_DURATION', payload: { exerciseId, duration } });
  }, []);

  const resetData = useCallback(() => {
    dispatch({ type: 'RESET_DATA' });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        completeSession,
        rateLastSession,
        toggleFavorite,
        completeOnboarding,
        startProgram,
        saveAmbientPreset,
        applyAmbientPreset,
        deleteAmbientPreset,
        setWidgetSnapshot,
        saveSessionSetup,
        deleteSessionSetup,
        setStressCheck,
        updatePreferences,
        setExerciseDuration,
        resetData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
