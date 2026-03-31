import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { AppData, SessionRecord, loadAppData, saveAppData } from '@/utils/storage';
import { getToday, getYesterday } from '@/utils/formatTime';

// ─── State ───

interface AppState extends AppData {
  isLoading: boolean;
}

const initialState: AppState = {
  isLoading: true,
  currentStreak: 0,
  lastSessionDate: '',
  longestStreak: 0,
  sessions: [],
  favorites: [],
  hasCompletedOnboarding: false,
};

// ─── Actions ───

type Action =
  | { type: 'LOAD_DATA'; payload: AppData }
  | { type: 'COMPLETE_SESSION'; payload: { exerciseId: string; duration: number } }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'COMPLETE_ONBOARDING'; payload?: 'calm' | 'focus' | 'energy' }
  | { type: 'RESET_DATA' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_DATA':
      return { ...state, ...action.payload, isLoading: false };

    case 'COMPLETE_SESSION': {
      const today = getToday();
      const yesterday = getYesterday();

      let newStreak = state.currentStreak;
      if (state.lastSessionDate === today) {
        // Allerede trent i dag, streak endres ikke
      } else if (state.lastSessionDate === yesterday) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

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

    case 'RESET_DATA':
      return { ...initialState, isLoading: false };

    default:
      return state;
  }
}

// ─── Context ───

interface AppContextValue {
  state: AppState;
  completeSession: (exerciseId: string, duration: number) => void;
  toggleFavorite: (exerciseId: string) => void;
  completeOnboarding: (goal?: 'calm' | 'focus' | 'energy') => void;
  resetData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Last data ved oppstart
  useEffect(() => {
    loadAppData().then((data) => {
      dispatch({ type: 'LOAD_DATA', payload: data });
    });
  }, []);

  // Lagre ved endringer
  useEffect(() => {
    if (!state.isLoading) {
      const { isLoading, ...data } = state;
      saveAppData(data);
    }
  }, [state]);

  const completeSession = useCallback((exerciseId: string, duration: number) => {
    dispatch({ type: 'COMPLETE_SESSION', payload: { exerciseId, duration } });
  }, []);

  const toggleFavorite = useCallback((exerciseId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE', payload: exerciseId });
  }, []);

  const completeOnboarding = useCallback((goal?: 'calm' | 'focus' | 'energy') => {
    dispatch({ type: 'COMPLETE_ONBOARDING', payload: goal });
  }, []);

  const resetData = useCallback(() => {
    dispatch({ type: 'RESET_DATA' });
  }, []);

  return (
    <AppContext.Provider value={{ state, completeSession, toggleFavorite, completeOnboarding, resetData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
