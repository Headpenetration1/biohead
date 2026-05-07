import {
  formatDurationAccessible,
  formatDurationShort,
  formatTime,
  toLocalDateKey,
} from '@/utils/formatTime';

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

describe('formatDurationShort', () => {
  it('uses spaced seconds below one minute', () => {
    expect(formatDurationShort(30)).toBe('30 s');
  });

  it('uses minutes for exact minute values', () => {
    expect(formatDurationShort(60)).toBe('1 min');
    expect(formatDurationShort(120)).toBe('2 min');
  });

  it('keeps mixed minute and second values compact', () => {
    expect(formatDurationShort(90)).toBe('1 min 30 s');
  });
});

describe('formatDurationAccessible', () => {
  it('uses full Norwegian units for accessibility labels', () => {
    expect(formatDurationAccessible(30)).toBe('30 sekunder');
    expect(formatDurationAccessible(60)).toBe('1 minutt');
    expect(formatDurationAccessible(125)).toBe('2 minutter og 5 sekunder');
  });
});
