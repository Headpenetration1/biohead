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

import { getProgramById } from '@/constants/programs';
import { reducer, baseInitial, type AppState } from '@/context/AppContext';
import { getToday } from '@/utils/formatTime';

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...baseInitial,
    isLoading: false,
    ...overrides,
  };
}

describe('pre-launch flow guardrails', () => {
  it('connects energy onboarding to the first energy program session completion', () => {
    const profile = { stressLevel: 2, sleepQuality: 4, focusNeed: 2 };
    const program = getProgramById('energy3');
    expect(program).toBeDefined();
    const dayOne = program!.days[0];

    const onboarded = reducer(makeState({ sessions: [], currentStreak: 0, lastSessionDate: '' }), {
      type: 'COMPLETE_ONBOARDING',
      payload: {
        goal: 'energy',
        profile,
        starterProgramId: 'energy3',
      },
    });

    expect(onboarded.hasCompletedOnboarding).toBe(true);
    expect(onboarded.userGoal).toBe('energy');
    expect(onboarded.onboardingProfile).toEqual(profile);
    expect(onboarded.activeProgram).toMatchObject({
      id: 'energy3',
      currentDay: 1,
      completedDays: 0,
    });

    const completed = reducer(onboarded, {
      type: 'COMPLETE_SESSION',
      payload: {
        exerciseId: dayOne.exerciseId,
        duration: dayOne.duration,
        program: { id: 'energy3', day: dayOne.day, duration: dayOne.duration },
      },
    });

    expect(completed.sessions).toHaveLength(1);
    expect(completed.sessions[0]).toMatchObject({
      exerciseId: dayOne.exerciseId,
      duration: dayOne.duration,
    });
    expect(completed.currentStreak).toBe(1);
    expect(completed.lastSessionDate).toBe(getToday());
    expect(completed.activeProgram).toMatchObject({
      id: 'energy3',
      currentDay: 2,
      completedDays: 1,
      lastCompletedDate: getToday(),
    });
  });

  it('retaking onboarding preserves local history, favorites, and saved setups', () => {
    const existingSession = {
      id: 'session-1',
      exerciseId: 'calm',
      duration: 60,
      completedAt: '2026-05-06T10:00:00.000Z',
    };
    const existingSetup = {
      id: 'setup-1',
      name: 'Rolig morgen',
      exerciseId: 'calm',
      duration: 60,
    };

    const next = reducer(
      makeState({
        hasCompletedOnboarding: true,
        sessions: [existingSession],
        favorites: ['calm'],
        savedSessions: [existingSetup],
      }),
      {
        type: 'COMPLETE_ONBOARDING',
        payload: {
          goal: 'focus',
          profile: { stressLevel: 2, sleepQuality: 4, focusNeed: 5 },
          starterProgramId: 'focus3',
        },
      }
    );

    expect(next.sessions).toEqual([existingSession]);
    expect(next.favorites).toEqual(['calm']);
    expect(next.savedSessions).toEqual([existingSetup]);
    expect(next.userGoal).toBe('focus');
    expect(next.activeProgram).toMatchObject({ id: 'focus3', currentDay: 1 });
  });
});
