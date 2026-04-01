import { getBestTimeBucket, getLast7DayTrend } from '@/utils/historyInsights';
import type { SessionRecord } from '@/utils/storage';

describe('history insights', () => {
  const baseNow = new Date('2026-04-01T12:00:00.000Z');

  it('builds 7-day trend with minute totals per day', () => {
    const sessions: SessionRecord[] = [
      { id: '1', exerciseId: 'calm', duration: 60, completedAt: '2026-03-31T08:00:00.000Z' },
      { id: '2', exerciseId: 'focus', duration: 120, completedAt: '2026-03-31T09:00:00.000Z' },
      { id: '3', exerciseId: 'sleep', duration: 90, completedAt: '2026-03-30T21:00:00.000Z' },
    ];
    const trend = getLast7DayTrend(sessions, baseNow);
    expect(trend).toHaveLength(7);
    const mar31 = trend.find((point) => point.date === '2026-03-31');
    const mar30 = trend.find((point) => point.date === '2026-03-30');
    expect(mar31?.minutes).toBe(3);
    expect(mar30?.minutes).toBe(2);
  });

  it('detects strongest time bucket', () => {
    const sessions: SessionRecord[] = [
      { id: '1', exerciseId: 'calm', duration: 60, completedAt: '2026-03-31T06:00:00.000Z' },
      { id: '2', exerciseId: 'focus', duration: 60, completedAt: '2026-03-30T07:00:00.000Z' },
      { id: '3', exerciseId: 'energy', duration: 60, completedAt: '2026-03-29T18:00:00.000Z' },
    ];
    expect(getBestTimeBucket(sessions)).toEqual({ bucket: 'morgen', count: 2 });
  });
});
