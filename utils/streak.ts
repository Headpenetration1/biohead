/**
 * Streak rules when a session completes today:
 * - Second+ session same day: streak unchanged
 * - First session today after yesterday: +1
 * - First session today after gap: reset to 1
 */
export function nextStreakOnSessionComplete(
  lastSessionDate: string,
  currentStreak: number,
  today: string,
  yesterday: string
): number {
  if (lastSessionDate === today) {
    return currentStreak;
  }
  if (lastSessionDate === yesterday) {
    return currentStreak + 1;
  }
  return 1;
}
