import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { AmbientMix, AmbientSoundscape } from '@/constants/ambientSounds';
import {
  AppData,
  ReminderTime,
  SessionRecord,
  defaultAppData,
  loadAppData,
  saveAppData,
  SoundMode,
} from '@/utils/storage';
import { getToday, getYesterday } from '@/utils/formatTime';
import { nextStreakOnSessionComplete } from '@/utils/streak';
import { syncDailyReminder } from '@/utils/reminders';

interface AppState extends AppData {
  isLoading: boolean;
}

const baseInitial: AppState = {
  ...defaultAppData,
  isLoading: true,
};

type Action =
  | { type: 'LOAD_DATA'; payload: AppData }
  | { type: 'COMPLETE_SESSION'; payload: { exerciseId: string; duration: number } }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'COMPLETE_ONBOARDING'; payload?: 'calm' | 'focus' | 'energy' }
  | {
      type: 'UPDATE_PREFERENCES';
      payload: Partial<{
        hapticsEnabled: boolean;
        reduceMotion: boolean;
        soundMode: SoundMode;
        ambientSoundscape: AmbientSoundscape;
        ambientMix: AmbientMix;
        reminderEnabled: boolean;
        reminderTimes: ReminderTime[];
        reminderQuietWeekends: boolean;
        reminderSkipIfDoneToday: boolean;
        weeklyGoalMinutes: number;
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
      };

      return {
        ...state,
        currentStreak: newStreak,
        lastSessionDate: today,
        longestStreak: Math.max(state.longestStreak, newStreak),
        sessions: [...state.sessions, newSession],
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
        userGoal: action.payload,
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
  ambientSoundscape: AmbientSoundscape;
  ambientMix: AmbientMix;
  reminderEnabled: boolean;
  reminderTimes: ReminderTime[];
  reminderQuietWeekends: boolean;
  reminderSkipIfDoneToday: boolean;
  weeklyGoalMinutes: number;
  healthSyncEnabled: boolean;
}>;

interface AppContextValue {
  state: AppState;
  completeSession: (exerciseId: string, duration: number) => void;
  toggleFavorite: (exerciseId: string) => void;
  completeOnboarding: (goal?: 'calm' | 'focus' | 'energy') => void;
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
      quietWeekends: state.reminderQuietWeekends,
      skipIfDoneToday: state.reminderSkipIfDoneToday,
      lastSessionDate: state.lastSessionDate,
    });
  }, [
    state.isLoading,
    state.reminderEnabled,
    state.reminderTimes,
    state.reminderQuietWeekends,
    state.reminderSkipIfDoneToday,
    state.lastSessionDate,
  ]);

  const completeSession = useCallback((exerciseId: string, duration: number) => {
    dispatch({ type: 'COMPLETE_SESSION', payload: { exerciseId, duration } });
  }, []);

  const toggleFavorite = useCallback((exerciseId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', payload: exerciseId });
  }, []);

  const completeOnboarding = useCallback((goal?: 'calm' | 'focus' | 'energy') => {
    dispatch({ type: 'COMPLETE_ONBOARDING', payload: goal });
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
        toggleFavorite,
        completeOnboarding,
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
