import type { SessionRecord } from '@/utils/storage';

const LEVEL_THRESHOLDS_MINUTES = [0, 20, 60, 120, 240, 420, 700, 1000] as const;

function weekStartDate(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getWeekMinutes(sessions: SessionRecord[], now = new Date()): number {
  const start = weekStartDate(now).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return Math.round(
    sessions.reduce((sum, session) => {
      const ts = new Date(session.completedAt).getTime();
      if (ts < start || ts >= end) return sum;
      return sum + session.duration / 60;
    }, 0)
  );
}

export function getWeekSessionCount(sessions: SessionRecord[], now = new Date()): number {
  const start = weekStartDate(now).getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return sessions.reduce((sum, session) => {
    const ts = new Date(session.completedAt).getTime();
    if (ts < start || ts >= end) return sum;
    return sum + 1;
  }, 0);
}

export function getTotalMinutes(sessions: SessionRecord[]): number {
  return Math.round(sessions.reduce((sum, session) => sum + session.duration / 60, 0));
}

export function getProgressionLevel(totalMinutes: number): {
  level: number;
  currentFloor: number;
  nextTarget: number | null;
} {
  let idx = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS_MINUTES.length; i += 1) {
    if (totalMinutes >= LEVEL_THRESHOLDS_MINUTES[i]) idx = i;
  }
  return {
    level: idx + 1,
    currentFloor: LEVEL_THRESHOLDS_MINUTES[idx],
    nextTarget: LEVEL_THRESHOLDS_MINUTES[idx + 1] ?? null,
  };
}
