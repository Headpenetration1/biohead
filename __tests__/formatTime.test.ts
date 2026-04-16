import { formatTime, toLocalDateKey } from '@/utils/formatTime';

describe('formatTime', () => {
  it('formats seconds only', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('pads minutes', () => {
    expect(formatTime(125)).toBe('2:05');
  });

  it('handles zero', () => {
    expect(formatTime(0)).toBe('0:00');
  });
});

describe('toLocalDateKey', () => {
  it('formats a date using local calendar parts', () => {
    const d = new Date(2026, 0, 5, 10, 0, 0); // 5 Jan 2026, local
    expect(toLocalDateKey(d)).toBe('2026-01-05');
  });

  it('pads month and day', () => {
    const d = new Date(2026, 8, 1, 0, 0, 0); // 1 Sep 2026, local
    expect(toLocalDateKey(d)).toBe('2026-09-01');
  });
});
