import { getWeekSessionCount } from '@/utils/progression';
import type { SessionRecord } from '@/utils/storage';

describe('getWeekSessionCount', () => {
  it('counts sessions inside current week only', () => {
    const sessions: SessionRecord[] = [
      {
        id: 'a',
        exerciseId: 'calm',
        duration: 60,
        completedAt: '2026-03-30T10:00:00.000Z',
      },
      {
        id: 'b',
        exerciseId: 'focus',
        duration: 60,
        completedAt: '2026-03-31T10:00:00.000Z',
      },
      {
        id: 'c',
        exerciseId: 'sleep',
        duration: 60,
        completedAt: '2026-03-22T10:00:00.000Z',
      },
    ];
    const count = getWeekSessionCount(sessions, new Date('2026-03-31T12:00:00.000Z'));
    expect(count).toBe(2);
  });
});
