jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    DATE: 'date',
    WEEKLY: 'weekly',
  },
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  setNotificationCategoryAsync: jest.fn(async () => undefined),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  setNotificationHandler: jest.fn(),
}));

import { getAdaptiveReminderTimes } from '@/utils/reminders';
import type { SessionRecord } from '@/utils/storage';

describe('adaptive reminder times', () => {
  it('keeps fallback for low data volume', () => {
    const sessions: SessionRecord[] = [
      {
        id: '1',
        exerciseId: 'calm',
        duration: 60,
        completedAt: '2026-03-31T09:10:00.000Z',
      },
    ];
    const result = getAdaptiveReminderTimes(sessions, [{ hour: 9, minute: 0 }]);
    expect(result).toEqual([{ hour: 9, minute: 0 }]);
  });

  it('derives top hour when enough sessions exist', () => {
    const sessions: SessionRecord[] = Array.from({ length: 6 }).map((_, idx) => ({
      id: String(idx),
      exerciseId: 'focus',
      duration: 60,
      completedAt: `2026-03-${10 + idx}T18:12:00.000Z`,
    }));
    const expectedHour = new Date(sessions[0].completedAt).getHours();
    const expectedMinute =
      Math.max(0, Math.min(55, Math.round(new Date(sessions[0].completedAt).getMinutes() / 5) * 5));
    const result = getAdaptiveReminderTimes(sessions, [{ hour: 9, minute: 0 }]);
    expect(result[0]).toEqual({ hour: expectedHour, minute: expectedMinute });
  });

  it('snaps median minute to the nearest 5-minute mark', () => {
    // Six sessions at HH:22/23/24 – median is 23, which rounds to 25.
    const hour = new Date('2026-03-10T07:22:00').getHours();
    const sessions: SessionRecord[] = [22, 23, 24, 22, 23, 24].map((min, idx) => ({
      id: String(idx),
      exerciseId: 'calm',
      duration: 60,
      // Use a local-time string so Date.getMinutes() reflects `min` regardless
      // of the test runner's timezone.
      completedAt: new Date(2026, 2, 10 + idx, hour, min, 0).toISOString(),
    }));
    const result = getAdaptiveReminderTimes(sessions, [{ hour: 9, minute: 0 }]);
    expect(result[0].hour).toBe(hour);
    expect(result[0].minute).toBe(25);
  });
});
