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
    const result = getAdaptiveReminderTimes(sessions, [{ hour: 9, minute: 0 }]);
    expect(result[0]).toEqual({ hour: expectedHour, minute: 0 });
  });
});
