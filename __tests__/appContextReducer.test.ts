jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/utils/reminders', () => ({
  syncDailyReminder: jest.fn(),
}));

jest.mock('@/utils/widgetBridge', () => ({
  syncWidgetSnapshot: jest.fn(),
}));

import { reducer, baseInitial, type AppState } from '@/context/AppContext';
import { getToday } from '@/utils/formatTime';

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...baseInitial,
    isLoading: false,
    ...overrides,
  };
}

describe('AppContext reducer', () => {
  describe('COMPLETE_SESSION', () => {
    it('appends a session and bumps streak to 1 on first completion', () => {
      const state = makeState({ sessions: [], currentStreak: 0, lastSessionDate: '' });
      const next = reducer(state, {
        type: 'COMPLETE_SESSION',
        payload: { exerciseId: 'calm', duration: 60 },
      });
      expect(next.sessions).toHaveLength(1);
      expect(next.sessions[0]).toMatchObject({ exerciseId: 'calm', duration: 60 });
      expect(next.currentStreak).toBe(1);
      expect(next.longestStreak).toBe(1);
      expect(next.lastSessionDate).toBe(getToday());
    });

    it('keeps streak the same when completing another session the same day', () => {
      const today = getToday();
      const state = makeState({
        sessions: [],
        currentStreak: 3,
        longestStreak: 3,
        lastSessionDate: today,
      });
      const next = reducer(state, {
        type: 'COMPLETE_SESSION',
        payload: { exerciseId: 'focus', duration: 60 },
      });
      expect(next.currentStreak).toBe(3);
      expect(next.longestStreak).toBe(3);
      expect(next.sessions).toHaveLength(1);
    });

    it('records stressBefore on the new session', () => {
      const state = makeState();
      const next = reducer(state, {
        type: 'COMPLETE_SESSION',
        payload: { exerciseId: 'calm', duration: 60, stressBefore: 4 },
      });
      expect(next.sessions[0].stressBefore).toBe(4);
    });

    it('saves ambientSoundscape on the session only when sound mode uses it', () => {
      const stateWithAmbient = makeState({
        soundMode: 'ambient',
        ambientSoundscape: 'waves',
      });
      const withAmbient = reducer(stateWithAmbient, {
        type: 'COMPLETE_SESSION',
        payload: { exerciseId: 'calm', duration: 60 },
      });
      expect(withAmbient.sessions[0].ambientSoundscape).toBe('waves');

      const stateWithoutAmbient = makeState({
        soundMode: 'off',
        ambientSoundscape: 'waves',
      });
      const withoutAmbient = reducer(stateWithoutAmbient, {
        type: 'COMPLETE_SESSION',
        payload: { exerciseId: 'calm', duration: 60 },
      });
      expect(withoutAmbient.sessions[0].ambientSoundscape).toBeUndefined();
    });

    it('advances the active program when completing its current-day exercise', () => {
      const state = makeState({
        activeProgram: {
          id: 'calm3',
          currentDay: 1,
          completedDays: 0,
          lastCompletedDate: undefined,
        },
      });
      const firstExerciseId: string = require('@/constants/programs')
        .getProgramById('calm3')
        .days[0].exerciseId;
      const next = reducer(state, {
        type: 'COMPLETE_SESSION',
        payload: {
          exerciseId: firstExerciseId,
          duration: 60,
          program: { id: 'calm3', day: 1, duration: 60 },
        },
      });
      expect(next.activeProgram).toMatchObject({
        completedDays: 1,
        currentDay: 2,
        lastCompletedDate: getToday(),
      });
    });

    it('does not advance the program when the wrong exercise is completed', () => {
      const state = makeState({
        activeProgram: {
          id: 'calm3',
          currentDay: 1,
          completedDays: 0,
          lastCompletedDate: undefined,
        },
      });
      const next = reducer(state, {
        type: 'COMPLETE_SESSION',
        payload: { exerciseId: '__definitely-not-a-real-id__', duration: 60 },
      });
      expect(next.activeProgram).toEqual(state.activeProgram);
    });

    it('does not advance the program without explicit program-day context', () => {
      const state = makeState({
        activeProgram: {
          id: 'calm3',
          currentDay: 1,
          completedDays: 0,
          lastCompletedDate: undefined,
        },
      });
      const firstDay = require('@/constants/programs').getProgramById('calm3').days[0];
      const next = reducer(state, {
        type: 'COMPLETE_SESSION',
        payload: { exerciseId: firstDay.exerciseId, duration: firstDay.duration },
      });
      expect(next.activeProgram).toEqual(state.activeProgram);
    });

    it('does not advance the program when the duration does not match the current day', () => {
      const state = makeState({
        activeProgram: {
          id: 'focus3',
          currentDay: 3,
          completedDays: 2,
          lastCompletedDate: undefined,
        },
      });
      const thirdDay = require('@/constants/programs').getProgramById('focus3').days[2];
      const next = reducer(state, {
        type: 'COMPLETE_SESSION',
        payload: {
          exerciseId: thirdDay.exerciseId,
          duration: 60,
          program: { id: 'focus3', day: thirdDay.day, duration: 60 },
        },
      });
      expect(next.activeProgram).toEqual(state.activeProgram);
    });
  });

  describe('RATE_LAST_SESSION', () => {
    it('does nothing when there are no sessions', () => {
      const state = makeState({ sessions: [] });
      const next = reducer(state, { type: 'RATE_LAST_SESSION', payload: 4 });
      expect(next).toEqual(state);
    });

    it('clamps the score to 1-5 and attaches it to the most recent session', () => {
      const state = makeState({
        sessions: [
          { id: '1', exerciseId: 'calm', duration: 60, completedAt: '2026-01-01T00:00:00.000Z' },
          { id: '2', exerciseId: 'focus', duration: 60, completedAt: '2026-01-02T00:00:00.000Z' },
        ],
      });

      const tooHigh = reducer(state, { type: 'RATE_LAST_SESSION', payload: 99 });
      expect(tooHigh.sessions[1].effectScore).toBe(5);
      expect(tooHigh.sessions[0].effectScore).toBeUndefined();

      const tooLow = reducer(state, { type: 'RATE_LAST_SESSION', payload: -10 });
      expect(tooLow.sessions[1].effectScore).toBe(1);
    });
  });

  describe('TOGGLE_FAVORITE', () => {
    it('adds when missing and removes when present', () => {
      const state = makeState({ favorites: [] });
      const added = reducer(state, { type: 'TOGGLE_FAVORITE', payload: 'calm' });
      expect(added.favorites).toEqual(['calm']);

      const removed = reducer(added, { type: 'TOGGLE_FAVORITE', payload: 'calm' });
      expect(removed.favorites).toEqual([]);
    });
  });
});
