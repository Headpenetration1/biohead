import { nextStreakOnSessionComplete } from '@/utils/streak';

describe('nextStreakOnSessionComplete', () => {
  const today = '2026-03-31';
  const yesterday = '2026-03-30';

  it('first session (no prior date) gives streak 1', () => {
    expect(nextStreakOnSessionComplete('', 0, today, yesterday)).toBe(1);
  });

  it('second session same day keeps streak', () => {
    expect(nextStreakOnSessionComplete(today, 3, today, yesterday)).toBe(3);
  });

  it('session after yesterday increments streak', () => {
    expect(nextStreakOnSessionComplete(yesterday, 2, today, yesterday)).toBe(3);
  });

  it('session after gap resets to 1', () => {
    expect(nextStreakOnSessionComplete('2026-03-01', 10, today, yesterday)).toBe(1);
  });
});
