import type { StressCheckSnapshot } from '@/utils/storage';
import { toLocalDateKey } from '@/utils/formatTime';

export const STRESS_CHECK_MAX_AGE_MS = 4 * 60 * 60 * 1000;

export function getFreshStressCheck(
  snapshot?: StressCheckSnapshot,
  now: Date = new Date()
): StressCheckSnapshot | undefined {
  if (!snapshot) return undefined;
  const updatedAt = new Date(snapshot.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return undefined;
  if (toLocalDateKey(updatedAt) !== toLocalDateKey(now)) return undefined;
  if (now.getTime() - updatedAt.getTime() > STRESS_CHECK_MAX_AGE_MS) return undefined;
  return snapshot;
}
