import type { SessionRecord } from '@/utils/storage';
import { toLocalDateKey } from '@/utils/formatTime';

export interface DayTrendPoint {
  date: string;
  minutes: number;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getLast7DayTrend(sessions: SessionRecord[], now = new Date()): DayTrendPoint[] {
  const end = startOfDay(now);
  const minutesByDate = new Map<string, number>();
  for (const session of sessions) {
    const completedAt = new Date(session.completedAt);
    if (Number.isNaN(completedAt.getTime())) continue;
    const key = toLocalDateKey(completedAt);
    minutesByDate.set(key, (minutesByDate.get(key) ?? 0) + session.duration / 60);
  }

  const points: DayTrendPoint[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(end);
    day.setDate(end.getDate() - i);
    const date = toLocalDateKey(day);
    points.push({ date, minutes: Math.round(minutesByDate.get(date) ?? 0) });
  }
  return points;
}

type TimeBucket = 'morgen' | 'dag' | 'kveld' | 'natt';

export function getBestTimeBucket(sessions: SessionRecord[]): {
  bucket: TimeBucket;
  count: number;
} | null {
  if (sessions.length === 0) return null;
  const counts: Record<TimeBucket, number> = {
    morgen: 0,
    dag: 0,
    kveld: 0,
    natt: 0,
  };
  for (const session of sessions) {
    const hour = new Date(session.completedAt).getHours();
    if (hour >= 5 && hour < 11) counts.morgen += 1;
    else if (hour >= 11 && hour < 17) counts.dag += 1;
    else if (hour >= 17 && hour < 23) counts.kveld += 1;
    else counts.natt += 1;
  }
  const entries = Object.entries(counts) as Array<[TimeBucket, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  return { bucket: entries[0][0], count: entries[0][1] };
}
